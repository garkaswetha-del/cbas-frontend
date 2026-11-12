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

type HiringSubTab = "dashboard" | "applications" | "process" | "induction";

export default function HRPage() {
  const [hiringSubTab, setHiringSubTab] = useState<HiringSubTab>("dashboard");

  const SUB_TABS: { id: HiringSubTab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "applications", label: "Applications" },
    { id: "process", label: "Hiring Process" },
    { id: "induction", label: "Induction" },
  ];

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">HR — Hiring</h1>
        <p className="text-sm text-gray-500">Applications → Hiring Process (Shortlist → Schedule → Interview → Score → Select) → Induction</p>
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

      {hiringSubTab === "dashboard" && <DashboardTab />}
      {hiringSubTab === "applications" && <ApplicationsTab />}
      {hiringSubTab === "process" && <HiringProcessTab />}
      {hiringSubTab === "induction" && <InductionAdminTab />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 p-4 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function BreakdownCard({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = entries.length ? Math.max(...entries.map(e => e[1])) : 1;
  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
      <h3 className="text-sm font-bold text-gray-700 mb-3">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-xs text-gray-400">No data yet</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, count]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className="w-28 shrink-0 truncate text-gray-600" title={key}>{key}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                <div className="bg-indigo-500 h-3 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
              </div>
              <span className="w-6 text-right font-semibold text-gray-700">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardTab() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/hr/dashboard/summary`);
      setSummary(r.data);
    } catch { setSummary(null); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>;
  if (!summary) return <div className="p-8 text-center text-gray-400 text-sm">Couldn't load dashboard data</div>;

  const pipelineOrder = ["applied", "shortlisted", "interview_scheduled", "interviewed", "selected", "rejected", "hired"];
  const pipelineData: Record<string, number> = {};
  pipelineOrder.forEach(k => { pipelineData[STAGE_LABELS[k] || k] = summary.byPipelineStage[k] || 0; });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Applicants" value={summary.totalApplicants} color="text-gray-800" />
        <StatCard label="Shortlisted" value={summary.shortlisted} color="text-blue-600" />
        <StatCard label="Interviews Scheduled" value={summary.interviews.total} color="text-yellow-600" />
        <StatCard label="Interviewed" value={summary.interviews.attended} color="text-purple-600" />
        <StatCard label="Selected" value={summary.selected} color="text-green-600" />
        <StatCard label="Hired" value={summary.hired} color="text-emerald-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BreakdownCard title="By Branch" data={summary.byBranch} />
        <BreakdownCard title="By Subject Applied For" data={summary.bySubject} />
        <BreakdownCard title="By School Stage (a candidate covering multiple stages counts in each)" data={summary.byStage} />
        <BreakdownCard title="Pipeline Status" data={pipelineData} />
      </div>

      <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Interviews</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Scheduled" value={summary.interviews.total} color="text-gray-800" />
          <StatCard label="Attended" value={summary.interviews.attended} color="text-green-600" />
          <StatCard label="Absent" value={summary.interviews.absent} color="text-red-500" />
          <StatCard label="Upcoming / Not Marked" value={summary.interviews.upcoming} color="text-yellow-600" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// APPLICATIONS
// ─────────────────────────────────────────────────────────────────
const SCHOOL_STAGES = ["Foundation", "Preparatory", "Middle", "Secondary"];
const EMPTY_FORM = {
  name: "", email: "", contact_no: "", address: "", locality: "",
  qualification: "", experience_years: "", experience_detail: "", skills: "",
  guardian_name: "", religion: "", caste: "",
  previous_salary: "", expected_salary: "", subject_applied_for: "", school_stage: [] as string[], branch: "", source_portal: "",
};

function ApplicationsTab() {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [uploadBranch, setUploadBranch] = useState("Nanjangudu");
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewingResume, setViewingResume] = useState<{ name: string; url: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/hr/applicants`, { params: { search: search || undefined, stage: stageFilter || undefined, branch: branchFilter || undefined } });
      setApplicants(r.data || []);
    } catch { setApplicants([]); }
    setLoading(false);
  };

  // Debounced so typing in the search box doesn't refetch (and flash the table) on every keystroke
  useEffect(() => {
    const t = setTimeout(() => load(), search ? 400 : 0);
    return () => clearTimeout(t);
  }, [search, stageFilter, branchFilter]);
  useEffect(() => { setSelected(new Set()); }, [search, stageFilter, branchFilter]);

  const toggleShortlist = async (a: any) => {
    const next = !a.is_shortlisted;
    setApplicants(prev => prev.map(x => x.id === a.id ? { ...x, is_shortlisted: next, stage: next ? "shortlisted" : "applied" } : x));
    try {
      await axios.patch(`${API}/hr/applicants/${a.id}/shortlist`, { is_shortlisted: next });
    } catch {
      setApplicants(prev => prev.map(x => x.id === a.id ? { ...x, is_shortlisted: a.is_shortlisted, stage: a.stage } : x));
      setMessage("❌ Error updating shortlist"); setTimeout(() => setMessage(""), 3000);
    }
  };

  const deleteApplicant = async (a: any) => {
    if (!confirm(`Delete ${a.name || "this applicant"}? This can't be undone.`)) return;
    try {
      await axios.delete(`${API}/hr/applicants/${a.id}`);
      setApplicants(prev => prev.filter(x => x.id !== a.id));
      setMessage("✅ Applicant deleted");
    } catch { setMessage("❌ Error deleting applicant"); }
    setTimeout(() => setMessage(""), 3000);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected(prev => prev.size === applicants.length ? new Set() : new Set(applicants.map(a => a.id)));
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} selected applicant(s)? This can't be undone.`)) return;
    const ids = Array.from(selected);
    try {
      await axios.post(`${API}/hr/applicants/bulk-delete`, { ids });
      setApplicants(prev => prev.filter(x => !selected.has(x.id)));
      setMessage(`✅ Deleted ${ids.length} applicant(s)`);
      setSelected(new Set());
    } catch { setMessage("❌ Error deleting applicants"); }
    setTimeout(() => setMessage(""), 3000);
  };

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
      formData.append("branch", uploadBranch);
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
        <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
          <option value="">All branches</option>
          <option value="Nanjangudu">Nanjangudu</option>
          <option value="KR Nagar">KR Nagar</option>
        </select>
        <select value={uploadBranch} onChange={e => setUploadBranch(e.target.value)} title="Branch these uploaded resumes belong to"
          className="border border-indigo-300 rounded px-2 py-1.5 text-sm bg-indigo-50">
          <option value="Nanjangudu">Upload as: Nanjangudu</option>
          <option value="KR Nagar">Upload as: KR Nagar</option>
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

      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-xs text-red-700 font-medium">{selected.size} selected</span>
          <button onClick={deleteSelected} className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 font-semibold">
            🗑 Delete Selected
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 underline">Clear selection</button>
        </div>
      )}

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
              <label className="text-xs text-gray-500 block mb-1">Stage(s) Applying For</label>
              <div className="flex flex-wrap gap-2 border border-gray-300 rounded px-2 py-1.5">
                {SCHOOL_STAGES.map(s => (
                  <label key={s} className="flex items-center gap-1 text-xs text-gray-700">
                    <input type="checkbox" checked={(form.school_stage || []).includes(s)}
                      onChange={e => setForm((f: any) => ({
                        ...f,
                        school_stage: e.target.checked ? [...(f.school_stage || []), s] : (f.school_stage || []).filter((x: string) => x !== s),
                      }))}
                      className="w-3.5 h-3.5 accent-indigo-600" />
                    {s}
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">Select more than one if they cover grades spanning stages (e.g. grade 8 & 9).</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Branch Applying For *</label>
              <select value={form.branch || ""} onChange={e => setForm((f: any) => ({ ...f, branch: e.target.value }))}
                className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full">
                <option value="">— Select —</option>
                <option value="Nanjangudu">Nanjangudu</option>
                <option value="KR Nagar">KR Nagar</option>
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
                <th className="px-3 py-2 text-center">
                  <input type="checkbox" checked={applicants.length > 0 && selected.size === applicants.length} onChange={toggleSelectAll} className="w-4 h-4 accent-red-600" title="Select all" />
                </th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Branch</th>
                <th className="px-3 py-2 text-left">Subject</th>
                <th className="px-3 py-2 text-left">School Stage</th>
                <th className="px-3 py-2 text-left">Qualification</th>
                <th className="px-3 py-2 text-left">Experience</th>
                <th className="px-3 py-2 text-left">Locality</th>
                <th className="px-3 py-2 text-left">Contact</th>
                <th className="px-3 py-2 text-center">Stage</th>
                <th className="px-3 py-2 text-center">Shortlist</th>
                <th className="px-3 py-2 text-center">Delete</th>
              </tr>
            </thead>
            <tbody>
              {applicants.map(a => (
                <Fragment key={a.id}>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleSelect(a.id)} className="w-4 h-4 accent-red-600" />
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-800 cursor-pointer" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>{a.name || "—"}</td>
                    <td className="px-3 py-2 cursor-pointer" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>{a.branch || "—"}</td>
                    <td className="px-3 py-2 cursor-pointer" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>{a.subject_applied_for || "—"}</td>
                    <td className="px-3 py-2 cursor-pointer" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>{(a.school_stage && a.school_stage.length) ? a.school_stage.join(", ") : "—"}</td>
                    <td className="px-3 py-2 cursor-pointer" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>{a.qualification || "—"}</td>
                    <td className="px-3 py-2 cursor-pointer" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>{a.experience_years ? `${a.experience_years} yrs` : "—"}</td>
                    <td className="px-3 py-2 cursor-pointer" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>{a.locality || "—"}</td>
                    <td className="px-3 py-2 cursor-pointer" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>{a.contact_no || a.email || "—"}</td>
                    <td className="px-3 py-2 text-center cursor-pointer" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                      <span className={`px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[a.stage] || "bg-gray-100 text-gray-500"}`}>
                        {STAGE_LABELS[a.stage] || a.stage}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={!!a.is_shortlisted} onChange={() => toggleShortlist(a)} className="w-4 h-4 accent-indigo-600" title="Shortlist this candidate" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => deleteApplicant(a)} className="text-red-500 hover:text-red-700" title="Delete applicant">🗑</button>
                    </td>
                  </tr>
                  {expanded === a.id && (
                    <tr className="bg-indigo-50/40">
                      <td colSpan={12} className="px-4 py-3">
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
                          {a.resume_file && (
                            <div>
                              <button onClick={() => setViewingResume({ name: a.name || "Resume", url: a.resume_file })} className="text-indigo-600 underline">
                                View Resume
                              </button>
                            </div>
                          )}
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

      {viewingResume && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewingResume(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-700">{viewingResume.name}'s Resume</h3>
              <button onClick={() => setViewingResume(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none px-2">✕</button>
            </div>
            {viewingResume.url.startsWith("data:application/pdf") ? (
              <iframe src={viewingResume.url} className="flex-1 w-full rounded-b-xl" title="Resume preview" />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-gray-500">
                <p>Word files can't be previewed in-browser — only PDF resumes support in-app viewing.</p>
                <a href={viewingResume.url} download={viewingResume.name} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-medium">
                  ⬇ Download instead
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// HIRING PROCESS (merged: Shortlist -> Schedule -> Interview -> Score -> Select)
// ─────────────────────────────────────────────────────────────────
const PROCESS_STAGES = ["Foundation", "Preparatory", "Middle", "Secondary"];
const STEP_LABELS: Record<string, string> = {
  needs_scheduling: "Needs Scheduling",
  awaiting_interview: "Awaiting Interview",
  absent: "Absent",
  needs_scoring: "Needs Scoring",
  needs_decision: "Needs Decision",
  hold: "On Hold",
  selected: "Selected",
  rejected: "Rejected",
};
const STEP_COLORS: Record<string, string> = {
  needs_scheduling: "bg-gray-100 text-gray-600",
  awaiting_interview: "bg-yellow-100 text-yellow-700",
  absent: "bg-red-100 text-red-700",
  needs_scoring: "bg-purple-100 text-purple-700",
  needs_decision: "bg-blue-100 text-blue-700",
  hold: "bg-orange-100 text-orange-700",
  selected: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};
function stepFor(iv: any): string {
  if (!iv) return "needs_scheduling";
  if (iv.result === "selected") return "selected";
  if (iv.result === "rejected") return "rejected";
  if (iv.result === "hold") return "hold";
  if (iv.attended === false) return "absent";
  if (iv.attended === null || iv.attended === undefined) return "awaiting_interview";
  const hasScores = iv.written_marks != null || iv.oral_marks != null || iv.demo_marks != null;
  return hasScores ? "needs_decision" : "needs_scoring";
}

function HiringProcessTab() {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [stepFilter, setStepFilter] = useState("");
  const [qualFilter, setQualFilter] = useState("");
  const [minExp, setMinExp] = useState("");
  const [localityFilter, setLocalityFilter] = useState("");

  const [schedForm, setSchedForm] = useState<Record<string, { date: string; time: string; interviewer: string }>>({});
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [schedOpen, setSchedOpen] = useState<Set<string>>(new Set());

  const [questionsMap, setQuestionsMap] = useState<Record<string, { question: string; expected_answer: string }[]>>({});
  const [loadingQuestions, setLoadingQuestions] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, { subject: string; stage: string }>>({});
  const [questionsOpen, setQuestionsOpen] = useState<Set<string>>(new Set());
  const toggleSet = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  };

  const [scoreEdits, setScoreEdits] = useState<Record<string, any>>({});
  const [savingScores, setSavingScores] = useState<string | null>(null);
  const [scoresOpen, setScoresOpen] = useState<Set<string>>(new Set());

  const [emailPrompt, setEmailPrompt] = useState<{ applicantId: string; email: string } | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [letter, setLetter] = useState<{ name: string; dataUri: string } | null>(null);

  const stored = localStorage.getItem("cbas_user");
  const currentUser = stored ? JSON.parse(stored) : null;

  const load = async () => {
    setLoading(true);
    try {
      const [apps, ivs] = await Promise.all([
        axios.get(`${API}/hr/applicants`, { params: { shortlisted: "true" } }),
        axios.get(`${API}/hr/interviews`),
      ]);
      setApplicants(apps.data || []);
      setInterviews(ivs.data || []);
    } catch { setApplicants([]); setInterviews([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const interviewFor = (applicantId: string) => interviews.find((i: any) => i.applicant_id === applicantId);

  const rows = applicants.map(a => ({ applicant: a, interview: interviewFor(a.id) }));
  const filtered = rows.filter(({ applicant: a, interview: iv }) => {
    if (stepFilter && stepFor(iv) !== stepFilter) return false;
    if (qualFilter && !(a.qualification || "").toLowerCase().includes(qualFilter.toLowerCase())) return false;
    if (minExp && Number(a.experience_years || 0) < Number(minExp)) return false;
    if (localityFilter && !(a.locality || "").toLowerCase().includes(localityFilter.toLowerCase())) return false;
    return true;
  });

  // ---- scheduling ----
  const fieldFor = (a: any, iv: any) => schedForm[a.id] || { date: iv?.interview_date?.slice(0, 10) || "", time: iv?.slot_time || "", interviewer: iv?.interviewer_name || "" };
  const setField = (a: any, iv: any, key: "date" | "time" | "interviewer", value: string) => {
    setSchedForm(prev => ({ ...prev, [a.id]: { ...fieldFor(a, iv), [key]: value } }));
  };
  const scheduleFor = async (a: any, iv: any) => {
    const f = fieldFor(a, iv);
    if (!f.date) { setMessage("❌ Pick a date first"); setTimeout(() => setMessage(""), 3000); return; }
    setScheduling(a.id);
    try {
      await axios.post(`${API}/hr/interviews/schedule`, {
        applicant_id: a.id, interview_date: f.date, slot_time: f.time, interviewer_name: f.interviewer, scheduled_by: currentUser?.name,
      });
      setMessage(`✅ Interview scheduled for ${a.name || "candidate"}`);
      load();
    } catch { setMessage("❌ Error scheduling"); }
    setScheduling(null);
    setTimeout(() => setMessage(""), 3000);
  };

  // ---- notify / attendance ----
  const notify = async (iv: any) => { await axios.patch(`${API}/hr/interviews/${iv.id}/notified`); load(); };
  const attendance = async (iv: any, attended: boolean) => { await axios.patch(`${API}/hr/interviews/${iv.id}/attendance`, { attended }); load(); };

  // ---- NCF questions ----
  const overrideFor = (a: any) => overrides[a.id] || {
    subject: a.subject_applied_for || "",
    stage: Array.isArray(a.school_stage) ? (a.school_stage.length === 1 ? a.school_stage[0] : "") : (a.school_stage || ""),
  };
  const setOverride = (a: any, key: "subject" | "stage", value: string) => {
    setOverrides(prev => ({ ...prev, [a.id]: { ...overrideFor(a), [key]: value } }));
  };
  const genQuestions = async (a: any) => {
    const ov = overrideFor(a);
    setLoadingQuestions(a.id);
    try {
      const r = await axios.get(`${API}/hr/applicants/${a.id}/interview-questions`, {
        params: { subject: ov.subject || undefined, stage: ov.stage || undefined },
      });
      setQuestionsMap(p => ({ ...p, [a.id]: r.data?.questions || [] }));
    } catch { setQuestionsMap(p => ({ ...p, [a.id]: [] })); }
    setLoadingQuestions(null);
  };

  // ---- scores ----
  const scoreFieldsFor = (iv: any) => scoreEdits[iv.id] || {
    written_marks: iv.written_marks ?? "", written_max: iv.written_max ?? "",
    oral_marks: iv.oral_marks ?? "", oral_max: iv.oral_max ?? "",
    demo_marks: iv.demo_marks ?? "", demo_max: iv.demo_max ?? "",
    notes: iv.notes ?? "",
  };
  const setScoreField = (iv: any, key: string, value: string) => {
    setScoreEdits(prev => ({ ...prev, [iv.id]: { ...scoreFieldsFor(iv), [key]: value } }));
  };
  const saveScores = async (iv: any) => {
    setSavingScores(iv.id);
    const e = scoreFieldsFor(iv);
    try {
      await axios.patch(`${API}/hr/interviews/${iv.id}/scores`, {
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
    setSavingScores(null);
    setTimeout(() => setMessage(""), 3000);
  };
  const scoreInput = (iv: any, key: string) => (
    <input type="number" step="0.5" value={scoreFieldsFor(iv)[key] ?? ""}
      onChange={e => setScoreField(iv, key, e.target.value)}
      className="border border-gray-300 rounded px-1.5 py-1 text-xs w-16 text-right" />
  );
  const totalScore = (iv: any) => (Number(iv.written_marks) || 0) + (Number(iv.oral_marks) || 0) + (Number(iv.demo_marks) || 0);
  const totalMax = (iv: any) => (Number(iv.written_max) || 0) + (Number(iv.oral_max) || 0) + (Number(iv.demo_max) || 0);

  // ---- decision ----
  const decide = async (a: any, iv: any, result: "selected" | "rejected" | "hold", email?: string) => {
    setDeciding(iv.id);
    try {
      const r = await axios.patch(`${API}/hr/interviews/${iv.id}/decide`, { result, email });
      if (result === "selected" && r.data?.temp_password) {
        setMessage(`✅ ${a.name} selected. Login created — temp password: ${r.data.temp_password} (share this with them; induction has been assigned)`);
      } else {
        setMessage(`✅ Marked ${result}`);
      }
      if (result === "selected" && r.data?.applicant_id) {
        try {
          const ar = await axios.get(`${API}/hr/applicants/${r.data.applicant_id}`);
          if (ar.data?.appointment_letter) setLetter({ name: ar.data.name || "Candidate", dataUri: ar.data.appointment_letter });
        } catch {}
      }
      setEmailPrompt(null);
      load();
    } catch (e: any) {
      setMessage("❌ " + (e?.response?.data?.message || "Error"));
    }
    setDeciding(null);
  };
  const trySelect = (a: any, iv: any) => {
    if (!a.email) { setEmailPrompt({ applicantId: a.id, email: "" }); return; }
    decide(a, iv, "selected");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={stepFilter} onChange={e => setStepFilter(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
          <option value="">All steps</option>
          {Object.entries(STEP_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <input value={qualFilter} onChange={e => setQualFilter(e.target.value)} placeholder="Filter: qualification"
          className="border border-gray-300 rounded px-2 py-1.5 text-xs" />
        <input value={minExp} onChange={e => setMinExp(e.target.value)} placeholder="Min experience (yrs)" type="number"
          className="border border-gray-300 rounded px-2 py-1.5 text-xs w-40" />
        <input value={localityFilter} onChange={e => setLocalityFilter(e.target.value)} placeholder="Filter: locality"
          className="border border-gray-300 rounded px-2 py-1.5 text-xs" />
      </div>

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
            <button onClick={() => {
              const row = rows.find(r => r.applicant.id === emailPrompt.applicantId);
              if (row && row.interview) decide(row.applicant, row.interview, "selected", emailPrompt.email);
            }} className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700">Confirm & Select</button>
            <button onClick={() => setEmailPrompt(null)} className="px-3 py-1 bg-gray-100 text-xs rounded hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No shortlisted candidates match</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Subject</th>
                <th className="px-3 py-2 text-left">School Stage</th>
                <th className="px-3 py-2 text-left">Qualification</th>
                <th className="px-3 py-2 text-left">Experience</th>
                <th className="px-3 py-2 text-center">Step</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ applicant: a, interview: iv }) => {
                const step = stepFor(iv);
                const f = fieldFor(a, iv);
                return (
                  <Fragment key={a.id}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                      <td className="px-3 py-2 font-medium text-gray-800">{a.name || "—"}</td>
                      <td className="px-3 py-2">{a.subject_applied_for || "—"}</td>
                      <td className="px-3 py-2">{(a.school_stage && a.school_stage.length) ? a.school_stage.join(", ") : "—"}</td>
                      <td className="px-3 py-2">{a.qualification || "—"}</td>
                      <td className="px-3 py-2">{a.experience_years ? `${a.experience_years} yrs` : "—"}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${STEP_COLORS[step]}`}>{STEP_LABELS[step]}</span>
                      </td>
                    </tr>
                    {expanded === a.id && (() => {
                      const hasScores = !!iv && (iv.written_marks != null || iv.oral_marks != null || iv.demo_marks != null);
                      const scheduleIsOpen = !iv || schedOpen.has(a.id);
                      const scoresAreOpen = !hasScores || scoresOpen.has(iv?.id);
                      return (
                      <tr className="bg-indigo-50/30">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="space-y-4 max-w-3xl">
                            {/* Step 1: Schedule */}
                            <div className="flex gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${iv ? "bg-green-500 text-white" : "bg-indigo-600 text-white"}`}>
                                {iv ? "✓" : "1"}
                              </div>
                              <div className="flex-1 pb-1">
                                {scheduleIsOpen ? (
                                  <>
                                    <p className="text-xs font-bold text-gray-600 mb-1.5">Schedule Interview</p>
                                    <div className="flex flex-wrap gap-2 items-end">
                                      <input type="date" value={f.date} onChange={e => setField(a, iv, "date", e.target.value)}
                                        className="border border-gray-300 rounded px-2 py-1 text-xs" />
                                      <input value={f.time} onChange={e => setField(a, iv, "time", e.target.value)} placeholder="10:30 AM"
                                        className="border border-gray-300 rounded px-2 py-1 text-xs w-24" />
                                      <input value={f.interviewer} onChange={e => setField(a, iv, "interviewer", e.target.value)} placeholder="Interviewer"
                                        className="border border-gray-300 rounded px-2 py-1 text-xs w-32" />
                                      <button onClick={() => { scheduleFor(a, iv); if (iv) toggleSet(schedOpen, setSchedOpen, a.id); }} disabled={scheduling === a.id}
                                        className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 font-medium">
                                        {scheduling === a.id ? "..." : iv ? "Save" : "📅 Schedule"}
                                      </button>
                                      {iv && <button onClick={() => toggleSet(schedOpen, setSchedOpen, a.id)} className="text-xs text-gray-400 underline">Cancel</button>}
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <p className="text-xs text-gray-700">
                                      <span className="font-semibold text-gray-600">Scheduled:</span> {fmtDate(iv.interview_date)} {iv.slot_time}
                                      {iv.interviewer_name ? ` · ${iv.interviewer_name}` : ""}
                                    </p>
                                    <button onClick={() => toggleSet(schedOpen, setSchedOpen, a.id)} className="text-xs text-indigo-600 underline">✏️ Edit</button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Step 2: Notify & Attendance */}
                            {iv && (
                              <div className="flex gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                  iv.attended === true ? "bg-green-500 text-white" : iv.attended === false ? "bg-red-500 text-white" : "bg-indigo-600 text-white"
                                }`}>
                                  {iv.attended === true ? "✓" : iv.attended === false ? "✗" : "2"}
                                </div>
                                <div className="flex-1 pb-1">
                                  <p className="text-xs font-bold text-gray-600 mb-1.5">Notify & Attendance</p>
                                  <div className="flex flex-wrap items-center gap-4 text-xs">
                                    {iv.candidate_notified
                                      ? <span className="text-green-600">✓ Notified</span>
                                      : <button onClick={() => notify(iv)} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200">Mark Notified</button>}
                                    {iv.attended === true && <span className="text-green-600">✓ Attended</span>}
                                    {iv.attended === false && <span className="text-red-500">✗ Absent</span>}
                                    {iv.attended === null && (
                                      <span className="inline-flex gap-1">
                                        <button onClick={() => attendance(iv, true)} className="px-2 py-0.5 bg-green-100 text-green-700 rounded hover:bg-green-200">Attended</button>
                                        <button onClick={() => attendance(iv, false)} className="px-2 py-0.5 bg-red-100 text-red-700 rounded hover:bg-red-200">Absent</button>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Step 3: Scores */}
                            {iv && iv.attended === true && (
                              <div className="flex gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${hasScores ? "bg-green-500 text-white" : "bg-indigo-600 text-white"}`}>
                                  {hasScores ? "✓" : "3"}
                                </div>
                                <div className="flex-1 pb-1">
                                  {scoresAreOpen ? (
                                    <>
                                      <p className="text-xs font-bold text-gray-600 mb-1.5">Scores</p>
                                      <div className="flex flex-wrap gap-3 items-end">
                                        <div><label className="block text-[10px] text-gray-400">Written</label>{scoreInput(iv, "written_marks")} / {scoreInput(iv, "written_max")}</div>
                                        <div><label className="block text-[10px] text-gray-400">Oral</label>{scoreInput(iv, "oral_marks")} / {scoreInput(iv, "oral_max")}</div>
                                        <div><label className="block text-[10px] text-gray-400">Demo</label>{scoreInput(iv, "demo_marks")} / {scoreInput(iv, "demo_max")}</div>
                                        <div className="flex-1 min-w-[150px]">
                                          <label className="block text-[10px] text-gray-400">Notes</label>
                                          <input value={scoreFieldsFor(iv).notes} onChange={e => setScoreField(iv, "notes", e.target.value)}
                                            className="border border-gray-300 rounded px-2 py-1 text-xs w-full" />
                                        </div>
                                        <button onClick={() => { saveScores(iv); toggleSet(scoresOpen, setScoresOpen, iv.id); }} disabled={savingScores === iv.id}
                                          className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 text-xs">
                                          {savingScores === iv.id ? "..." : "💾 Save"}
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <p className="text-xs text-gray-700">
                                        <span className="font-semibold text-gray-600">Total:</span> {totalScore(iv)} / {totalMax(iv) || "—"}
                                        <span className="text-gray-400"> (Written {iv.written_marks ?? "—"}, Oral {iv.oral_marks ?? "—"}, Demo {iv.demo_marks ?? "—"})</span>
                                      </p>
                                      <button onClick={() => toggleSet(scoresOpen, setScoresOpen, iv.id)} className="text-xs text-indigo-600 underline">✏️ Edit</button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Step 4: Decision */}
                            {iv && iv.attended === true && (
                              <div className="flex gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${iv.result !== "pending" ? "bg-green-500 text-white" : "bg-indigo-600 text-white"}`}>
                                  {iv.result !== "pending" ? "✓" : "4"}
                                </div>
                                <div className="flex-1 pb-1">
                                  <p className="text-xs font-bold text-gray-600 mb-1.5">Decision</p>
                                  {iv.result === "pending" ? (
                                    <span className="inline-flex gap-1">
                                      <button onClick={() => trySelect(a, iv)} disabled={deciding === iv.id} className="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 text-xs">Select</button>
                                      <button onClick={() => decide(a, iv, "hold")} disabled={deciding === iv.id} className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50 text-xs">Hold</button>
                                      <button onClick={() => decide(a, iv, "rejected")} disabled={deciding === iv.id} className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 text-xs">Reject</button>
                                    </span>
                                  ) : (
                                    <p className="text-xs text-gray-700">Result: <span className="font-semibold capitalize">{iv.result}</span></p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Separate tool, not part of the sequential flow — usable anytime */}
                          <div className="mt-4 pt-3 border-t border-dashed border-gray-300 max-w-3xl">
                            <button onClick={() => toggleSet(questionsOpen, setQuestionsOpen, a.id)} className="text-xs font-bold text-purple-700 flex items-center gap-1">
                              🤖 NCF Interview Questions {questionsOpen.has(a.id) ? "▲" : "▼"}
                            </button>
                            {questionsOpen.has(a.id) && (
                              <div className="mt-2">
                                <div className="flex flex-wrap gap-2 items-center mb-2">
                                  <input value={overrideFor(a).subject} onChange={e => setOverride(a, "subject", e.target.value)} placeholder="Subject"
                                    title="Subject (override if blank or wrong)" className="border border-gray-300 rounded px-2 py-1 text-xs w-28" />
                                  <select value={overrideFor(a).stage} onChange={e => setOverride(a, "stage", e.target.value)}
                                    title="Stage (override if blank or wrong)" className="border border-gray-300 rounded px-2 py-1 text-xs w-28">
                                    <option value="">Stage</option>
                                    {PROCESS_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                  <button onClick={() => genQuestions(a)} disabled={loadingQuestions === a.id}
                                    className="px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50 text-xs">
                                    {loadingQuestions === a.id ? "Generating..." : questionsMap[a.id] ? "🔄 Regenerate" : "🤖 Generate"}
                                  </button>
                                </div>
                                {questionsMap[a.id] && (
                                  questionsMap[a.id].length === 0 ? (
                                    <p className="text-gray-400 text-xs">No questions generated — check the Groq API key is configured.</p>
                                  ) : (
                                    <ol className="list-decimal list-inside space-y-2 text-gray-700 bg-purple-50 rounded p-3">
                                      {questionsMap[a.id].map((q, i) => (
                                        <li key={i}>
                                          <span className="font-medium">{q.question}</span>
                                          {q.expected_answer && (
                                            <div className="ml-5 mt-1 text-gray-600 bg-white rounded border border-purple-200 px-2 py-1">
                                              <span className="font-semibold text-purple-700">Expected answer: </span>{q.expected_answer}
                                            </div>
                                          )}
                                        </li>
                                      ))}
                                    </ol>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })()}
                  </Fragment>
                );
              })}
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
