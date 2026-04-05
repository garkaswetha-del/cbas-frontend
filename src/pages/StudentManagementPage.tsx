import { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

const API = "https://cbas-backend-production.up.railway.app";
const CLASSES = ["Pre-KG", "LKG", "UKG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"];
const GENDERS = ["Male", "Female", "Other"];

const emptyForm = {
  name: "", admission_no: "", current_class: "", section: "",
  gender: "", phone: "", dob: "", admission_year: "",
  father_name: "", mother_name: "", parent_phone: "",
  father_qualification: "", mother_qualification: "",
  father_working_status: "", mother_working_status: "", address: "",
};

export default function StudentManagementPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, byGrade: [] });
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [filterGrade, setFilterGrade] = useState("");
  const [filterSection, setFilterSection] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);
  const PAGE_SIZE = 50;

  useEffect(() => { fetchStudents(); fetchStats(); }, [filterGrade, filterSection, search]);

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

  const showMsg = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
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
      setForm({ ...emptyForm });
      setEditId(null);
      setShowForm(false);
      fetchStudents();
      fetchStats();
    } catch (e: any) {
      showMsg(`❌ ${e.response?.data?.message || "Error saving student"}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Issue TC to ${name}? Student will be marked inactive.`)) return;
    try {
      await axios.delete(`${API}/students/${id}`);
      showMsg(`✅ TC issued to ${name}`);
      fetchStudents();
      fetchStats();
    } catch { showMsg("❌ Error"); }
  };

  // Excel Import
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      const students: any[] = [];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[1]) continue; // skip empty rows

        const raw = String(row[2] || "").trim();
        const parts = raw.split("-");
        let grade = "", section = "";
        if (parts.length >= 2) {
          const gradeMap: Record<string, string> = {
            "PKG": "Pre-KG", "LKG": "LKG", "UKG": "UKG",
            "1": "Grade 1", "2": "Grade 2", "3": "Grade 3",
            "4": "Grade 4", "5": "Grade 5", "6": "Grade 6",
            "7": "Grade 7", "8": "Grade 8", "9": "Grade 9", "10": "Grade 10"
          };
          grade = gradeMap[parts[0].trim()] || parts[0].trim();
          section = parts.slice(1).join("-").trim().toUpperCase();
        }

        students.push({
          name: String(row[1]).trim(),
          current_class: grade,
          section: section,
        });
      }

      const res = await axios.post(`${API}/students/bulk-import`, { students });
      setImportResult(res.data);
      fetchStudents();
      fetchStats();
    } catch (e: any) {
      showMsg(`❌ Import failed: ${e.message}`);
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const paginatedStudents = students.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(students.length / PAGE_SIZE);
  const uniqueSections = [...new Set(students.map(s => s.section).filter(Boolean))].sort();

  return (
    <div className="p-3 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Student Management</h1>
          <p className="text-sm text-gray-500">Total active students: {stats.total}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {importing ? "Importing..." : "📥 Import Excel"}
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileImport} />
          <button
            onClick={() => { setEditId(null); setForm({ ...emptyForm }); setShowForm(!showForm); }}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
          >
            + Add Student
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 px-4 py-2 rounded text-sm border ${message.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>
          {message}
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <p className="font-semibold text-blue-800">Import Complete</p>
          <p className="text-blue-700">✅ Successfully imported: {importResult.success} students</p>
          {importResult.failed > 0 && <p className="text-orange-600">⚠️ Skipped (already exists): {importResult.failed}</p>}
          <button onClick={() => setImportResult(null)} className="text-xs text-blue-500 mt-1">Dismiss</button>
        </div>
      )}

      {/* Stats by Grade */}
      <div className="grid grid-cols-2 gap-3 mb-5 sm:grid-cols-4 md:grid-cols-7">
        {stats.byGrade?.map((g: any) => (
          <div key={g.grade}
            onClick={() => setFilterGrade(filterGrade === g.grade ? "" : g.grade)}
            className={`cursor-pointer rounded-lg p-2 text-center border transition-all ${filterGrade === g.grade ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-gray-200 hover:border-indigo-400"}`}>
            <p className="text-xs font-medium truncate">{g.grade}</p>
            <p className={`text-lg font-bold ${filterGrade === g.grade ? "text-white" : "text-indigo-700"}`}>{g.count}</p>
          </div>
        ))}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">{editId ? "✏️ Edit Student" : "Add New Student"}</h2>
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
              <select value={form.current_class} onChange={e => setForm({ ...form, current_class: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm">
                <option value="">-- Select --</option>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Section</label>
              <input type="text" value={form.section}
                onChange={e => setForm({ ...form, section: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" placeholder="e.g. HIMALAYA" />
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
            <button onClick={handleSubmit}
              className="px-6 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
              {editId ? "Update" : "Save"}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm({ ...emptyForm }); }}
              className="px-6 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input type="text" placeholder="Search by name..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-52" />
        <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">All Classes</option>
          {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterSection} onChange={e => setFilterSection(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm">
          <option value="">All Sections</option>
          {uniqueSections.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(filterGrade || filterSection || search) && (
          <button onClick={() => { setFilterGrade(""); setFilterSection(""); setSearch(""); }}
            className="text-xs text-red-500 hover:text-red-700">Clear filters</button>
        )}
        <span className="text-sm text-gray-500 self-center">Showing {students.length} students</span>
      </div>

      {/* Students Table */}
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
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">
                  No students found. Import Excel or add manually.
                </td></tr>
              )}
              {paginatedStudents.map((s, i) => (
                <tr key={s.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-2 text-gray-400">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-2 font-medium text-gray-800">{s.name}</td>
                  <td className="px-4 py-2 text-gray-600">{s.admission_no || "-"}</td>
                  <td className="px-4 py-2 text-gray-600">{s.current_class || "-"}</td>
                  <td className="px-4 py-2 text-gray-600">{s.section || "-"}</td>
                  <td className="px-4 py-2 text-gray-600">{s.gender || "-"}</td>
                  <td className="px-4 py-2 text-gray-600">{s.phone || "-"}</td>
                  <td className="px-4 py-2 flex gap-2">
                    <button onClick={() => openEdit(s)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Edit</button>
                    <button onClick={() => handleDelete(s.id, s.name)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium">TC</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
                Previous
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
