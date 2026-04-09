import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = "https://cbas-backend-production.up.railway.app";

const STAGES = [
  { value: "foundation", label: "Foundation (Pre-KG to Grade 2)" },
  { value: "preparatory", label: "Preparatory (Grade 3–5)" },
  { value: "middle", label: "Middle (Grade 6–8)" },
  { value: "secondary", label: "Secondary (Grade 9–10)" },
  { value: "general", label: "General (All grades)" },
];

const CLASSES = [
  "Pre-KG", "LKG", "UKG",
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
  "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
];

const subjectColor = (subject: string): string => {
  const colors: Record<string, string> = {
    language: "bg-blue-100 text-blue-800",
    numeracy: "bg-green-100 text-green-800",
    science: "bg-purple-100 text-purple-800",
    social_science: "bg-orange-100 text-orange-800",
    arts: "bg-pink-100 text-pink-800",
    foundation: "bg-yellow-100 text-yellow-800",
    physical_education: "bg-cyan-100 text-cyan-800",
    hindi: "bg-red-100 text-red-800",
    kannada: "bg-lime-100 text-lime-800",
    vocational_education: "bg-violet-100 text-violet-800",
    interdisciplinary: "bg-teal-100 text-teal-800",
  };
  return colors[subject] || "bg-indigo-100 text-indigo-800";
};

export default function CompetencyManagementPage() {
  const [activeTab, setActiveTab] = useState<"view" | "add" | "import">("view");
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({ subject: "", stage: "", grade: "", search: "" });
  const [editItem, setEditItem] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const fileRef = useRef<HTMLInputElement>(null);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

  const [form, setForm] = useState({
    subject: "", stage: "foundation", grade: "Grade 1",
    domain: "", competency_code: "", description: "",
  });

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchCompetencies(); setPage(1); }, [filters]);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/activities/competencies/stats`);
      setStats(res.data);
      if (res.data.subjects?.length > 0) {
        setAvailableSubjects(res.data.subjects.sort());
      }
    } catch { }
  };

  const fetchCompetencies = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.subject) params.append("subject", filters.subject);
      if (filters.stage) params.append("stage", filters.stage);
      if (filters.grade) params.append("grade", filters.grade);
      if (filters.search) params.append("search", filters.search);
      const res = await axios.get(`${API}/activities/competencies?${params}`);
      setCompetencies(res.data);
    } catch { setCompetencies([]); }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.subject || !form.grade || !form.description) {
      setMessage("❌ Subject, Grade and Description are required");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    try {
      await axios.post(`${API}/activities/competencies`, {
        ...form,
        subject: form.subject.trim().toLowerCase().replace(/\s+/g, '_'),
      });
      setMessage("✅ Competency added successfully");
      fetchCompetencies(); fetchStats();
      setForm({ subject: "", stage: "foundation", grade: "Grade 1", domain: "", competency_code: "", description: "" });
    } catch { setMessage("❌ Error adding competency"); }
    setTimeout(() => setMessage(""), 3000);
  };

  const handleUpdate = async () => {
    try {
      await axios.put(`${API}/activities/competencies/${editItem.id}`, {
        ...editItem,
        subject: editItem.subject.trim().toLowerCase().replace(/\s+/g, '_'),
      });
      setMessage("✅ Updated successfully");
      setShowEditModal(false);
      fetchCompetencies(); fetchStats();
    } catch { setMessage("❌ Error updating"); }
    setTimeout(() => setMessage(""), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this competency? It won't be deleted but will be hidden.")) return;
    try {
      await axios.delete(`${API}/activities/competencies/${id}`);
      setMessage("✅ Competency deactivated");
      fetchCompetencies(); fetchStats();
    } catch { setMessage("❌ Error"); }
    setTimeout(() => setMessage(""), 3000);
  };

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { setMessage("❌ Please select a file"); return; }
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("subject", ""); // subject comes from the file itself
      const res = await axios.post(`${API}/activities/competencies/import`, formData);
      setImportResult(res.data);
      fetchCompetencies();
      fetchStats();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Unknown error";
      setMessage(`❌ Import failed: ${errMsg}`);
    }
    setImporting(false);
    setTimeout(() => setMessage(""), 6000);
  };

  const paginated = competencies.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(competencies.length / PAGE_SIZE);

  return (
    <div className="p-3 sm:p-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">Competency Registry</h1>
        <p className="text-sm text-gray-500">Manage all NCF competencies — import, add, edit or delete</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="mb-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="bg-white rounded-xl shadow p-4 border-l-4 border-indigo-500">
              <p className="text-xs text-gray-500">Total Competencies</p>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-400">
              <p className="text-xs text-gray-500">Subjects</p>
              <p className="text-2xl font-bold text-gray-800">{stats.bySubject?.length || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-400">
              <p className="text-xs text-gray-500">Stages</p>
              <p className="text-2xl font-bold text-gray-800">{stats.byStage?.length || 0}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-4 border-l-4 border-purple-400">
              <p className="text-xs text-gray-500">Showing</p>
              <p className="text-2xl font-bold text-gray-800">{competencies.length}</p>
            </div>
          </div>
          {/* Subject pills */}
          <div className="flex flex-wrap gap-2">
            {stats.bySubject?.map((s: any) => (
              <button key={s.subject}
                onClick={() => setFilters(f => ({ ...f, subject: f.subject === s.subject ? "" : s.subject }))}
                className={`text-xs px-3 py-1 rounded-full font-medium border transition-all ${filters.subject === s.subject ? 'ring-2 ring-indigo-400' : ''} ${subjectColor(s.subject)}`}>
                {s.subject.replace(/_/g, ' ')} ({s.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 flex-nowrap">
        {[
          { id: "view", label: "📋 View & Manage" },
          { id: "add", label: "➕ Add New" },
          { id: "import", label: "📥 Import Excel" },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${activeTab === t.id ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border border-gray-300 hover:bg-indigo-50"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded text-sm border ${message.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>
          {message}
        </div>
      )}

      {/* ── VIEW TAB ── */}
      {activeTab === "view" && (
        <div>
          {/* Filters */}
          <div className="flex gap-3 mb-3 flex-wrap items-end">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Subject</label>
              <select value={filters.subject} onChange={e => setFilters(f => ({ ...f, subject: e.target.value }))}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm">
                <option value="">All Subjects</option>
                {availableSubjects.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Stage</label>
              <select value={filters.stage} onChange={e => setFilters(f => ({ ...f, stage: e.target.value }))}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm">
                <option value="">All Stages</option>
                {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Grade</label>
              <select value={filters.grade} onChange={e => setFilters(f => ({ ...f, grade: e.target.value }))}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm">
                <option value="">All Grades</option>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Search</label>
              <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                placeholder="Search code or description..."
                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-56" />
            </div>
            <button onClick={() => setFilters({ subject: "", stage: "", grade: "", search: "" })}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-600 hover:bg-gray-50">
              Clear
            </button>
          </div>

          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">{competencies.length} competencies found · Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 text-xs border rounded disabled:opacity-40 hover:bg-gray-50">← Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1 text-xs border rounded disabled:opacity-40 hover:bg-gray-50">Next →</button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg shadow border border-gray-200">
            <table className="w-full text-sm bg-white">
              <thead className="bg-gray-50 text-xs text-gray-500 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Subject</th>
                  <th className="px-3 py-2 text-left">Stage</th>
                  <th className="px-3 py-2 text-left">Grade</th>
                  <th className="px-3 py-2 text-left">Domain</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading...</td></tr>
                )}
                {!loading && paginated.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">No competencies found. Import from Excel or add manually.</td></tr>
                )}
                {paginated.map((c, i) => (
                  <tr key={c.id} className={i % 2 === 0 ? "bg-white hover:bg-indigo-50" : "bg-gray-50 hover:bg-indigo-50"}>
                    <td className="px-3 py-2 text-gray-400 text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs font-bold text-indigo-700 whitespace-nowrap">{c.competency_code}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${subjectColor(c.subject)}`}>
                        {c.subject?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs capitalize">{c.stage}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs whitespace-nowrap">{c.grade}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs max-w-[130px] truncate">{c.domain}</td>
                    <td className="px-3 py-2 text-gray-700 text-xs max-w-[320px]">
                      <div className="truncate" title={c.description}>{c.description}</div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => { setEditItem({ ...c }); setShowEditModal(true); }}
                          className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded hover:bg-indigo-200">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(c.id)}
                          className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200">
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination bottom */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-3">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="px-3 py-1 text-xs border rounded disabled:opacity-40 hover:bg-gray-50">First</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 text-xs border rounded disabled:opacity-40 hover:bg-gray-50">← Prev</button>
              <span className="px-3 py-1 text-xs text-gray-600">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1 text-xs border rounded disabled:opacity-40 hover:bg-gray-50">Next →</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="px-3 py-1 text-xs border rounded disabled:opacity-40 hover:bg-gray-50">Last</button>
            </div>
          )}
        </div>
      )}

      {/* ── ADD TAB ── */}
      {activeTab === "add" && (
        <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Add New Competency</h2>
          <p className="text-xs text-gray-400 mb-4">You can add competencies for any existing or new subject.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Subject <span className="text-red-400">*</span></label>
              <input value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="e.g. language, physical_education, art_craft"
                list="subject-options"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
              <datalist id="subject-options">
                {availableSubjects.map(s => <option key={s} value={s} />)}
              </datalist>
              <p className="text-xs text-gray-400 mt-0.5">Type existing or new subject name</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Stage</label>
              <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm">
                {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Grade <span className="text-red-400">*</span></label>
              <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm">
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Domain</label>
              <input value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
                placeholder="e.g. Listening, Operations, Motor Skills"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Competency Code</label>
              <input value={form.competency_code} onChange={e => setForm(f => ({ ...f, competency_code: e.target.value }))}
                placeholder="e.g. C-1.1 (leave blank to auto-generate)"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Description <span className="text-red-400">*</span></label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={4} placeholder="Full competency description..."
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
            </div>
          </div>
          <button onClick={handleAdd}
            className="mt-4 px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium">
            ➕ Add Competency
          </button>
        </div>
      )}

      {/* ── IMPORT TAB ── */}
      {activeTab === "import" && (
        <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Import from Excel</h2>
          <p className="text-xs text-gray-500 mb-4">
            Upload your flat Excel file. The system reads the <strong>Competencies</strong> sheet automatically.
            Subject and grade are read from the file — no need to select them here.
          </p>

          {/* Format guide */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-5">
            <p className="text-xs font-bold text-indigo-700 mb-2">📋 Required Column Names (row 1 must be headers):</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-indigo-600">
              <div><strong>competency_code</strong><br />e.g. C-1.1</div>
              <div><strong>subject</strong><br />e.g. language</div>
              <div><strong>stage</strong><br />e.g. foundation</div>
              <div><strong>grade</strong><br />e.g. Grade 3</div>
              <div><strong>domain</strong><br />e.g. Listening</div>
              <div><strong>description</strong><br />Full text</div>
            </div>
            <p className="text-xs text-indigo-500 mt-3">
              ✅ Duplicates are automatically skipped (same code + subject + grade + domain).<br />
              ✅ You can reimport anytime — only new rows will be added.<br />
              ✅ New subjects are created automatically — no setup needed.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Excel File (.xlsx)</label>
              <input ref={fileRef} type="file" accept=".xlsx,.xls"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
            </div>
            <button onClick={handleImport} disabled={importing}
              className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
              {importing ? "⏳ Importing... please wait" : "📥 Import Now"}
            </button>
          </div>

          {importResult && (
            <div className="mt-5 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-semibold text-green-800 mb-2">✅ Import Complete</p>
              <div className="space-y-1 text-sm">
                <p className="text-green-700">✅ Inserted: <strong>{importResult.inserted}</strong> new competencies</p>
                <p className="text-gray-600">⏭ Skipped (already exist): <strong>{importResult.skipped}</strong></p>
                {importResult.errors?.length > 0 && (
                  <p className="text-red-600">❌ Errors: <strong>{importResult.errors.length}</strong></p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {showEditModal && editItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto mx-2 sm:mx-0">
            <div className="p-3 sm:p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Edit Competency</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Competency Code</label>
                  <input value={editItem.competency_code}
                    onChange={e => setEditItem({ ...editItem, competency_code: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Subject</label>
                    <input value={editItem.subject}
                      onChange={e => setEditItem({ ...editItem, subject: e.target.value })}
                      list="edit-subject-list"
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
                    <datalist id="edit-subject-list">
                      {availableSubjects.map(s => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Stage</label>
                    <select value={editItem.stage}
                      onChange={e => setEditItem({ ...editItem, stage: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm">
                      {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Grade</label>
                    <select value={editItem.grade}
                      onChange={e => setEditItem({ ...editItem, grade: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm">
                      {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Domain</label>
                    <input value={editItem.domain}
                      onChange={e => setEditItem({ ...editItem, domain: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Description</label>
                  <textarea value={editItem.description}
                    onChange={e => setEditItem({ ...editItem, description: e.target.value })}
                    rows={5} className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleUpdate}
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium">
                  💾 Save Changes
                </button>
                <button onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}