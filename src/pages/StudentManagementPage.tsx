import { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

const API = "https://cbas-backend-production.up.railway.app";
const CLASSES = [
  "Pre-KG", "LKG", "UKG",
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
  "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
];
const GENDERS = ["Male", "Female", "Other"];
const GRADE_ORDER = ["Pre-KG","LKG","UKG","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10"];

const emptyForm = {
  name: "", admission_no: "", current_class: "", section: "",
  gender: "", phone: "", dob: "", admission_year: "",
  father_name: "", mother_name: "", parent_phone: "",
  father_qualification: "", mother_qualification: "",
  father_working_status: "", mother_working_status: "", address: "",
};

function today() { return new Date().toISOString().split("T")[0]; }

export default function StudentManagementPage() {
  const [activeTab, setActiveTab] = useState<"active" | "tc" | "alumni">("active");
  const [students, setStudents] = useState<any[]>([]);
  const [tcStudents, setTcStudents] = useState<any[]>([]);
  const [alumni, setAlumni] = useState<any[]>([]);
  const [alumniYear, setAlumniYear] = useState("");
  const [stats, setStats] = useState<any>({ total: 0, byGrade: [], byGender: [], tcCount: 0 });
  const [sections, setSections] = useState<Record<string, string[]>>({});

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [formSections, setFormSections] = useState<string[]>([]);

  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const [filterGrade, setFilterGrade] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  // TC modal
  const [tcTarget, setTcTarget] = useState<any>(null);
  const [tcDate, setTcDate] = useState(today());
  const [tcReason, setTcReason] = useState("");

  // Promotion wizard
  const [showPromotion, setShowPromotion] = useState(false);
  const [promoGrade, setPromoGrade] = useState("");
  const [promoSection, setPromoSection] = useState("");
  const [promoNewSection, setPromoNewSection] = useState("");
  const [promoPreview, setPromoPreview] = useState<any>(null);
  const [promoStep, setPromoStep] = useState<"select" | "preview" | "done">("select");
  const [promoSections, setPromoSections] = useState<string[]>([]);

  // Profile modal
  const [profileStudent, setProfileStudent] = useState<any>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchStudents(); fetchStats(); fetchAllSections(); }, [filterGrade, filterSection, search]);
  useEffect(() => { if (activeTab === "tc") fetchTCRegister(); }, [activeTab]);
  useEffect(() => { if (activeTab === "alumni") fetchAlumni(); }, [activeTab, alumniYear]);

  const showMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(""), 4000); };

  const fetchStudents = async () => {
    try {
      const params: any = {};
      if (filterGrade) params.grade = filterGrade;
      if (filterSection) params.section = filterSection;
      if (search) params.search = search;
      const res = await axios.get(`${API}/students`, { params });
      setStudents(res.data);
      setPage(1);
    } catch { setStudents([]); }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/students/stats`);
      setStats(res.data);
    } catch { }
  };

  const fetchTCRegister = async () => {
    try {
      const res = await axios.get(`${API}/students/tc-register`);
      setTcStudents(res.data || []);
    } catch { }
  };

  const fetchAlumni = async () => {
    try {
      const params: any = {};
      if (alumniYear) params.graduation_year = alumniYear;
      const res = await axios.get(`${API}/students/alumni`, { params });
      setAlumni(res.data?.alumni || []);
    } catch { }
  };

  const fetchAllSections = async () => {
    try {
      const res = await axios.get(`${API}/students/sections/all`);
      setSections(res.data || {});
    } catch { }
  };

  const fetchSectionsForGrade = async (grade: string) => {
    if (!grade) { setFormSections([]); return; }
    try {
      const res = await axios.get(`${API}/students/sections/${encodeURIComponent(grade)}`);
      setFormSections(res.data?.sections || []);
    } catch { setFormSections([]); }
  };

  const openAdd = () => {
    setEditId(null); setForm({ ...emptyForm }); setFormSections([]);
    setShowForm(true);
  };

  const openEdit = (s: any) => {
    setEditId(s.id);
    setForm({
      name: s.name || "", admission_no: s.admission_no || "",
      current_class: s.current_class || "", section: s.section || "",
      gender: s.gender || "", phone: s.phone || "",
      dob: s.dob || "", admission_year: s.admission_year || "",
      father_name: s.father_name || "", mother_name: s.mother_name || "",
      parent_phone: s.parent_phone || "",
      father_qualification: s.father_qualification || "",
      mother_qualification: s.mother_qualification || "",
      father_working_status: s.father_working_status || "",
      mother_working_status: s.mother_working_status || "",
      address: s.address || "",
    });
    if (s.current_class) fetchSectionsForGrade(s.current_class);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name) { showMsg("❌ Name is required"); return; }
    try {
      if (editId) {
        await axios.patch(`${API}/students/${editId}`, form);
        showMsg(`✅ ${form.name} updated`);
      } else {
        await axios.post(`${API}/students`, form);
        showMsg(`✅ ${form.name} added`);
      }
      setForm({ ...emptyForm }); setEditId(null); setShowForm(false);
      fetchStudents(); fetchStats(); fetchAllSections();
    } catch (e: any) {
      showMsg(`❌ ${e.response?.data?.message || "Error saving student"}`);
    }
  };

  const openTCModal = (s: any) => {
    setTcTarget(s); setTcDate(today()); setTcReason("");
  };

  const issueTC = async () => {
    if (!tcTarget) return;
    try {
      await axios.patch(`${API}/students/${tcTarget.id}/tc`, { tc_date: tcDate, tc_reason: tcReason });
      showMsg(`✅ TC issued to ${tcTarget.name}`);
      setTcTarget(null);
      fetchStudents(); fetchStats(); fetchTCRegister();
    } catch { showMsg("❌ Error issuing TC"); }
  };

  const permanentDelete = async (id: string, name: string) => {
    if (!confirm(`Permanently delete ${name}? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/students/${id}/permanent`);
      showMsg(`✅ ${name} permanently deleted`);
      fetchTCRegister(); fetchStats();
    } catch { showMsg("❌ Error deleting student"); }
  };

  // Promotion wizard
  const openPromotion = () => {
    setPromoGrade(""); setPromoSection(""); setPromoNewSection("");
    setPromoPreview(null); setPromoStep("select"); setPromoSections([]);
    setShowPromotion(true);
  };

  const loadPromoSections = async (grade: string) => {
    setPromoGrade(grade); setPromoSection(""); setPromoPreview(null);
    try {
      const res = await axios.get(`${API}/students/sections/${encodeURIComponent(grade)}`);
      setPromoSections(res.data?.sections || []);
    } catch { setPromoSections([]); }
  };

  const previewPromotion = async () => {
    if (!promoGrade || !promoSection) { showMsg("❌ Select grade and section"); return; }
    try {
      const res = await axios.get(`${API}/students/promotion/preview`, {
        params: { grade: promoGrade, section: promoSection },
      });
      setPromoPreview(res.data);
      setPromoStep("preview");
    } catch { showMsg("❌ Error loading preview"); }
  };

  const executePromotion = async () => {
    if (!promoNewSection.trim()) { showMsg("❌ Enter the new section"); return; }
    try {
      const res = await axios.post(`${API}/students/promotion/execute`, {
        grade: promoGrade, section: promoSection, new_section: promoNewSection,
      });
      showMsg(`✅ ${res.data.message}`);
      setPromoStep("done");
      fetchStudents(); fetchStats(); fetchAllSections();
    } catch { showMsg("❌ Promotion failed"); }
  };

  // Export current filtered list as Excel
  const exportToExcel = () => {
    const rows = students.map((s, i) => ({
      "#": i + 1, Name: s.name, "Admission No.": s.admission_no || "",
      Class: s.current_class || "", Section: s.section || "",
      Gender: s.gender || "", Phone: s.phone || "", DOB: s.dob || "",
      "Admission Year": s.admission_year || "",
      "Father Name": s.father_name || "", "Mother Name": s.mother_name || "",
      "Parent Phone": s.parent_phone || "", Address: s.address || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `students_${filterGrade || "all"}_${filterSection || "all"}.xlsx`);
  };

  // Excel Import — now captures more fields
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setImportResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const header: string[] = (rows[0] || []).map((h: any) => String(h).trim().toLowerCase());

      const col = (row: any[], ...names: string[]) => {
        for (const n of names) {
          const idx = header.findIndex(h => h.includes(n.toLowerCase()));
          if (idx !== -1 && row[idx] !== undefined && String(row[idx]).trim() !== "") return String(row[idx]).trim();
        }
        return "";
      };

      const parseClassSection = (raw: string) => {
        const parts = raw.split("-");
        if (parts.length < 2) return { grade: raw.trim(), section: "" };
        const gradeMap: Record<string, string> = {
          "pkg": "Pre-KG", "lkg": "LKG", "ukg": "UKG",
          "1": "Grade 1", "2": "Grade 2", "3": "Grade 3", "4": "Grade 4", "5": "Grade 5",
          "6": "Grade 6", "7": "Grade 7", "8": "Grade 8", "9": "Grade 9", "10": "Grade 10",
        };
        const gradeKey = parts[0].trim().toLowerCase();
        return {
          grade: gradeMap[gradeKey] || parts[0].trim(),
          section: parts.slice(1).join("-").trim().toUpperCase(),
        };
      };

      const parsed: any[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const name = col(row, "name", "student name", "full name");
        if (!name) continue;

        // Try to parse class-section from a combined column
        const rawClass = col(row, "class", "grade", "class-section", "class section");
        const { grade, section } = parseClassSection(rawClass);

        parsed.push({
          name,
          current_class: grade,
          section: section || col(row, "section"),
          admission_no: col(row, "admission", "adm no", "adm. no", "roll"),
          gender: col(row, "gender", "sex"),
          dob: col(row, "dob", "date of birth", "birth"),
          admission_year: col(row, "admission year", "year of admission", "year"),
          father_name: col(row, "father name", "father"),
          mother_name: col(row, "mother name", "mother"),
          parent_phone: col(row, "parent phone", "parent contact", "parent mobile"),
          phone: col(row, "phone", "mobile", "contact"),
          address: col(row, "address"),
        });
      }

      const res = await axios.post(`${API}/students/bulk-import`, { students: parsed });
      setImportResult(res.data);
      fetchStudents(); fetchStats(); fetchAllSections();
    } catch (e: any) {
      showMsg(`❌ Import failed: ${e.message}`);
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const paginatedStudents = students.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(students.length / PAGE_SIZE);
  const uniqueSections = [...new Set(students.map(s => s.section).filter(Boolean))].sort();

  const sortedByGrade = [...(stats.byGrade || [])].sort(
    (a, b) => GRADE_ORDER.indexOf(a.grade) - GRADE_ORDER.indexOf(b.grade)
  );

  return (
    <div className="p-3 sm:p-6">
      {/* ── HEADER ── */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Student Management</h1>
          <p className="text-sm text-gray-500">{stats.total} active students · {stats.tcCount || 0} TC'd</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={openPromotion}
            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 font-medium">
            🎓 Promote Students
          </button>
          <button onClick={exportToExcel}
            className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 font-medium">
            📤 Export Excel
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={importing}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium">
            {importing ? "Importing..." : "📥 Import Excel"}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileImport} />
          <button onClick={openAdd}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium">
            + Add Student
          </button>
        </div>
      </div>

      {/* ── MESSAGE ── */}
      {message && (
        <div className={`mb-4 px-4 py-2 rounded text-sm border ${message.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>
          {message}
        </div>
      )}

      {/* ── IMPORT RESULT ── */}
      {importResult && (
        <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <p className="font-semibold text-blue-800">Import Complete</p>
          <p className="text-blue-700">✅ {importResult.success} created · ⏭ {importResult.failed} skipped</p>
          {importResult.errors?.length > 0 && (
            <div className="mt-2 overflow-x-auto">
              <table className="text-xs w-full border border-blue-200 rounded">
                <thead><tr className="bg-blue-100"><th className="px-2 py-1 text-left">Name</th><th className="px-2 py-1 text-left">Reason</th></tr></thead>
                <tbody>
                  {importResult.errors.slice(0, 10).map((e: string, i: number) => (
                    <tr key={i} className="border-t border-blue-100"><td colSpan={2} className="px-2 py-1 text-blue-700">{e}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button onClick={() => setImportResult(null)} className="text-xs text-blue-500 mt-2">Dismiss</button>
        </div>
      )}

      {/* ── STATS BAR ── */}
      <div className="mb-5">
        {/* Gender split */}
        {stats.byGender?.length > 0 && (
          <div className="flex gap-3 mb-3 flex-wrap">
            {stats.byGender.map((g: any) => (
              <div key={g.gender} className="bg-white rounded-lg border border-gray-200 px-4 py-2 flex items-center gap-2 shadow-sm">
                <span className="text-lg">{g.gender === "Male" ? "👦" : g.gender === "Female" ? "👧" : "🧑"}</span>
                <div>
                  <p className="text-xs text-gray-500">{g.gender}</p>
                  <p className="text-base font-bold text-gray-800">{g.count}</p>
                </div>
              </div>
            ))}
            <div className="bg-indigo-50 rounded-lg border border-indigo-200 px-4 py-2 flex items-center gap-2 shadow-sm">
              <span className="text-lg">👥</span>
              <div>
                <p className="text-xs text-indigo-500">Total Active</p>
                <p className="text-base font-bold text-indigo-800">{stats.total}</p>
              </div>
            </div>
          </div>
        )}
        {/* Grade cards — clickable filters */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-13">
          {sortedByGrade.map((g: any) => (
            <div key={g.grade}
              onClick={() => { setFilterGrade(filterGrade === g.grade ? "" : g.grade); setFilterSection(""); setActiveTab("active"); }}
              className={`cursor-pointer rounded-lg p-2 text-center border transition-all ${filterGrade === g.grade ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-gray-200 hover:border-indigo-400"}`}>
              <p className="text-xs font-medium truncate">{g.grade}</p>
              <p className={`text-lg font-bold ${filterGrade === g.grade ? "text-white" : "text-indigo-700"}`}>{g.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── ADD/EDIT FORM ── */}
      {showForm && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">{editId ? "✏️ Edit Student" : "➕ Add New Student"}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
            {[
              { label: "Full Name *", key: "name", type: "text" },
              { label: "Admission No.", key: "admission_no", type: "text" },
              { label: "DOB", key: "dob", type: "date" },
              { label: "Admission Year", key: "admission_year", type: "text" },
              { label: "Phone", key: "phone", type: "text" },
              { label: "Father Name", key: "father_name", type: "text" },
              { label: "Mother Name", key: "mother_name", type: "text" },
              { label: "Parent Phone", key: "parent_phone", type: "text" },
              { label: "Father Qualification", key: "father_qualification", type: "text" },
              { label: "Mother Qualification", key: "mother_qualification", type: "text" },
              { label: "Father Working Status", key: "father_working_status", type: "text" },
              { label: "Mother Working Status", key: "mother_working_status", type: "text" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Class</label>
              <select value={form.current_class}
                onChange={e => { setForm({ ...form, current_class: e.target.value, section: "" }); fetchSectionsForGrade(e.target.value); }}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm">
                <option value="">-- Select --</option>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Section</label>
              {formSections.length > 0 ? (
                <select value={form.section} onChange={e => setForm({ ...form, section: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm">
                  <option value="">-- Select --</option>
                  {formSections.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="__custom__">Other (type below)</option>
                </select>
              ) : (
                <input type="text" value={form.section}
                  onChange={e => setForm({ ...form, section: e.target.value })}
                  placeholder="e.g. HIMALAYA"
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
              )}
              {form.section === "__custom__" && (
                <input type="text" placeholder="Type section name"
                  onChange={e => setForm({ ...form, section: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm mt-1" />
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Gender</label>
              <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm">
                <option value="">-- Select --</option>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Address</label>
              <input type="text" value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleSubmit} className="px-6 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-semibold">
              {editId ? "Update" : "Save"}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm({ ...emptyForm }); }}
              className="px-6 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── TABS ── */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setActiveTab("active")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "active" ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-400"}`}>
          Active Students ({stats.total})
        </button>
        <button onClick={() => setActiveTab("tc")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "tc" ? "bg-orange-500 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-orange-400"}`}>
          TC Register ({stats.tcCount || 0})
        </button>
        <button onClick={() => setActiveTab("alumni")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "alumni" ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-green-400"}`}>
          Alumni
        </button>
      </div>

      {/* ── ACTIVE STUDENTS TAB ── */}
      {activeTab === "active" && (
        <>
          {/* Filter bar */}
          <div className="flex gap-3 mb-4 flex-wrap items-end">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Search</label>
              <input type="text" placeholder="Search by name..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-52" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Class</label>
              <select value={filterGrade} onChange={e => { setFilterGrade(e.target.value); setFilterSection(""); }}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm">
                <option value="">All Classes</option>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Section</label>
              <select value={filterSection} onChange={e => setFilterSection(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm">
                <option value="">All Sections</option>
                {(filterGrade && sections[filterGrade] ? sections[filterGrade] : uniqueSections).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {(filterGrade || filterSection || search) && (
              <button onClick={() => { setFilterGrade(""); setFilterSection(""); setSearch(""); }}
                className="px-3 py-1.5 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-50">
                Clear Filters
              </button>
            )}
            <span className="text-sm text-gray-500 self-end ml-auto">Showing {students.length} students</span>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Adm. No.</th>
                    <th className="px-4 py-2 text-left">Class</th>
                    <th className="px-4 py-2 text-left">Section</th>
                    <th className="px-4 py-2 text-left">Gender</th>
                    <th className="px-4 py-2 text-left">Phone</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-10 text-gray-400">No students found.</td></tr>
                  )}
                  {paginatedStudents.map((s, i) => (
                    <tr key={s.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-4 py-2 text-gray-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="px-4 py-2">
                        <button onClick={() => setProfileStudent(s)}
                          className="font-medium text-gray-800 hover:text-indigo-600 text-left">
                          {s.name}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-gray-600">{s.admission_no || "-"}</td>
                      <td className="px-4 py-2 text-gray-600">{s.current_class || "-"}</td>
                      <td className="px-4 py-2 text-gray-600">{s.section || "-"}</td>
                      <td className="px-4 py-2 text-gray-600">{s.gender || "-"}</td>
                      <td className="px-4 py-2 text-gray-600">{s.phone || "-"}</td>
                      <td className="px-4 py-2 flex gap-2">
                        <button onClick={() => openEdit(s)}
                          className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 font-medium">✏️ Edit</button>
                        <button onClick={() => openTCModal(s)}
                          className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 font-medium">📄 TC</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">Page {page} of {totalPages} ({students.length} students)</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Previous</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TC REGISTER TAB ── */}
      {activeTab === "tc" && (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
            <h2 className="text-sm font-bold text-orange-700">TC Register — {tcStudents.length} students</h2>
            <p className="text-xs text-orange-500 mt-0.5">Students who have been issued Transfer Certificates</p>
          </div>
          {tcStudents.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No TC records found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Class</th>
                    <th className="px-3 py-2 text-left">Section</th>
                    <th className="px-3 py-2 text-left">TC Date</th>
                    <th className="px-3 py-2 text-left">Reason</th>
                    <th className="px-3 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tcStudents.map((s, i) => (
                    <tr key={s.id} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-700">{s.name}</td>
                      <td className="px-3 py-2 text-gray-500">{s.current_class || "-"}</td>
                      <td className="px-3 py-2 text-gray-500">{s.section || "-"}</td>
                      <td className="px-3 py-2 text-orange-600 font-medium">{s.tc_date || "-"}</td>
                      <td className="px-3 py-2 text-gray-500">{s.tc_reason || "-"}</td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => permanentDelete(s.id, s.name)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium">
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ALUMNI TAB ── */}
      {activeTab === "alumni" && (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-green-50 border-b border-green-100 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-green-700">Alumni — {alumni.length} graduates</h2>
              <p className="text-xs text-green-500 mt-0.5">Students who completed Grade 10</p>
            </div>
            <select value={alumniYear} onChange={e => setAlumniYear(e.target.value)}
              className="border border-green-300 rounded px-2 py-1.5 text-sm text-green-700 bg-white">
              <option value="">All Years</option>
              {[...new Set(alumni.map((a: any) => a.graduation_year).filter(Boolean))].sort().reverse().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {alumni.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No alumni records found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Admission No.</th>
                    <th className="px-3 py-2 text-left">Gender</th>
                    <th className="px-3 py-2 text-left">Graduated</th>
                  </tr>
                </thead>
                <tbody>
                  {alumni.map((s: any, i: number) => (
                    <tr key={s.id} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-700">{s.name}</td>
                      <td className="px-3 py-2 text-gray-500">{s.admission_no || "-"}</td>
                      <td className="px-3 py-2 text-gray-500">{s.gender || "-"}</td>
                      <td className="px-3 py-2 text-green-600 font-medium">{s.graduation_year || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TC MODAL ── */}
      {tcTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-1">📄 Issue Transfer Certificate</h3>
            <p className="text-xs text-gray-500 mb-4">Student: <strong>{tcTarget.name}</strong> — {tcTarget.current_class} {tcTarget.section}</p>
            <div className="mb-3">
              <label className="text-xs text-gray-500 block mb-1">TC Date *</label>
              <input type="date" value={tcDate} onChange={e => setTcDate(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 text-sm w-full" />
            </div>
            <div className="mb-4">
              <label className="text-xs text-gray-500 block mb-1">Reason (optional)</label>
              <input type="text" value={tcReason} onChange={e => setTcReason(e.target.value)}
                placeholder="e.g. Relocation, School change..."
                className="border border-gray-300 rounded px-3 py-2 text-sm w-full" />
            </div>
            <div className="flex gap-2">
              <button onClick={issueTC}
                className="flex-1 px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 font-semibold">
                Issue TC
              </button>
              <button onClick={() => setTcTarget(null)}
                className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROMOTION WIZARD ── */}
      {showPromotion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800">🎓 Promote Students</h3>
              <button onClick={() => setShowPromotion(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            {promoStep === "select" && (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">Select the current grade and section to promote all students to the next grade.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Current Grade</label>
                    <select value={promoGrade} onChange={e => loadPromoSections(e.target.value)}
                      className="border border-gray-300 rounded px-3 py-2 text-sm w-full">
                      <option value="">-- Select Grade --</option>
                      {CLASSES.filter(c => c !== "Grade 10").map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Current Section</label>
                    <select value={promoSection} onChange={e => setPromoSection(e.target.value)}
                      disabled={!promoGrade}
                      className="border border-gray-300 rounded px-3 py-2 text-sm w-full disabled:opacity-50">
                      <option value="">-- Select Section --</option>
                      {promoSections.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={previewPromotion} disabled={!promoGrade || !promoSection}
                  className="px-6 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 font-semibold">
                  Preview Promotion →
                </button>
              </div>
            )}

            {promoStep === "preview" && promoPreview && (
              <div className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-purple-800">
                    {promoPreview.student_count} students: <strong>{promoPreview.current_grade} {promoPreview.current_section}</strong> → <strong>{promoPreview.next_grade}</strong>
                  </p>
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Adm. No.</th><th className="px-3 py-2 text-left">→ Grade</th></tr>
                    </thead>
                    <tbody>
                      {promoPreview.students.map((s: any) => (
                        <tr key={s.id} className="border-t border-gray-100">
                          <td className="px-3 py-1.5 font-medium text-gray-700">{s.name}</td>
                          <td className="px-3 py-1.5 text-gray-500">{s.admission_no || "-"}</td>
                          <td className="px-3 py-1.5 text-purple-600">{s.promoted_to}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">New Section in {promoPreview.next_grade} *</label>
                  <input type="text" value={promoNewSection} onChange={e => setPromoNewSection(e.target.value)}
                    placeholder="e.g. HIMALAYA"
                    className="border border-gray-300 rounded px-3 py-2 text-sm w-full" />
                  <p className="text-xs text-gray-400 mt-1">All {promoPreview.student_count} students will be placed in this section</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={executePromotion} disabled={!promoNewSection.trim()}
                    className="flex-1 px-6 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 font-semibold">
                    ✅ Confirm Promotion
                  </button>
                  <button onClick={() => setPromoStep("select")}
                    className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">← Back</button>
                </div>
              </div>
            )}

            {promoStep === "done" && (
              <div className="text-center py-6">
                <p className="text-4xl mb-3">🎉</p>
                <p className="text-sm font-semibold text-gray-800">Promotion Complete!</p>
                <p className="text-xs text-gray-500 mt-1">Students have been moved to the next grade.</p>
                <button onClick={() => setShowPromotion(false)}
                  className="mt-4 px-6 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-semibold">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STUDENT PROFILE MODAL ── */}
      {profileStudent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800">👤 {profileStudent.name}</h3>
              <button onClick={() => setProfileStudent(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                ["Class", profileStudent.current_class],
                ["Section", profileStudent.section],
                ["Gender", profileStudent.gender],
                ["Admission No.", profileStudent.admission_no],
                ["DOB", profileStudent.dob],
                ["Admission Year", profileStudent.admission_year],
                ["Phone", profileStudent.phone],
                ["Parent Phone", profileStudent.parent_phone],
                ["Father Name", profileStudent.father_name],
                ["Mother Name", profileStudent.mother_name],
                ["Father Qualification", profileStudent.father_qualification],
                ["Mother Qualification", profileStudent.mother_qualification],
                ["Father Working Status", profileStudent.father_working_status],
                ["Mother Working Status", profileStudent.mother_working_status],
                ["Address", profileStudent.address],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-lg p-2">
                  <p className="text-gray-400">{label}</p>
                  <p className="font-medium text-gray-800 mt-0.5">{value || "—"}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setProfileStudent(null); openEdit(profileStudent); }}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-semibold">
                ✏️ Edit Student
              </button>
              <button onClick={() => setProfileStudent(null)}
                className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
