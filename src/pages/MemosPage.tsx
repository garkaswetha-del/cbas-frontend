import { useState, useEffect } from "react";
import axios from "axios";
import { currentAcademicYear } from "../utils/academicYear";

const API = "https://cbas-backend-production.up.railway.app";
const STAGES = ["Foundation", "Preparatory", "Middle", "Secondary"];
const ACADEMIC_YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = 2025 + i;
  return `${y}-${String(y + 1).slice(2)}`;
});

interface Memo {
  id: string;
  title: string;
  content: string;
  target_type: string;
  target_value: string | null;
  academic_year: string | null;
  created_at: string;
  read_count: number;
  is_draft?: boolean;
}

interface Teacher { id: string; name: string; }

interface StatusRow {
  teacher_id: string;
  teacher_name: string;
  sent_at: string;
  is_read: boolean;
  read_at: string | null;
  reply: string | null;
}

const emptyForm = {
  title: "",
  content: "",
  target_type: "all",
  target_stage: "",
  selected_teacher_ids: [] as string[],
};

export default function MemosPage() {
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [memos, setMemos] = useState<Memo[]>([]);
  const [drafts, setDrafts] = useState<Memo[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [statusData, setStatusData] = useState<Record<string, StatusRow[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [msg, setMsg] = useState("");
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [draftsOpen, setDraftsOpen] = useState(true);

  useEffect(() => { fetchAll(); }, [academicYear]);

  const fetchAll = async () => {
    fetchMemos();
    fetchDrafts();
    fetchTeachers();
  };

  const fetchMemos = async () => {
    try {
      const r = await axios.get(`${API}/memos?academic_year=${academicYear}`);
      setMemos(r.data || []);
    } catch {}
  };

  const fetchDrafts = async () => {
    try {
      const r = await axios.get(`${API}/memos/drafts?academic_year=${academicYear}`);
      setDrafts(r.data || []);
    } catch {}
  };

  const fetchTeachers = async () => {
    try {
      const r = await axios.get(`${API}/observation/teachers?academic_year=${academicYear}`);
      setTeachers(r.data || []);
    } catch {}
  };

  const buildPayload = (isDraft: boolean) => {
    const payload: any = {
      title: form.title.trim(),
      content: form.content.trim(),
      target_type: form.target_type,
      academic_year: academicYear,
      is_draft: isDraft,
    };
    if (form.target_type === "stage") payload.target_value = form.target_stage;
    if (form.target_type === "teachers") payload.target_value = form.selected_teacher_ids.join(",");
    else payload.target_value = null;
    return payload;
  };

  const validate = (isDraft: boolean) => {
    if (!form.title.trim()) { setMsg("Title is required."); return false; }
    if (!isDraft && !form.content.trim()) { setMsg("Content is required."); return false; }
    if (!isDraft && form.target_type === "stage" && !form.target_stage) { setMsg("Please select a stage."); return false; }
    if (!isDraft && form.target_type === "teachers" && form.selected_teacher_ids.length === 0) { setMsg("Please select at least one teacher."); return false; }
    return true;
  };

  const resetForm = () => {
    setForm(emptyForm);
    setTeacherSearch("");
    setEditingDraftId(null);
    setMsg("");
  };

  const handleSend = async () => {
    if (!validate(false)) return;
    setSending(true); setMsg("");
    try {
      if (editingDraftId) {
        await axios.patch(`${API}/memos/${editingDraftId}`, { ...buildPayload(false) });
      } else {
        await axios.post(`${API}/memos`, buildPayload(false));
      }
      setMsg("Memo sent successfully.");
      resetForm();
      fetchMemos();
      fetchDrafts();
    } catch { setMsg("Failed to send memo."); }
    setSending(false);
  };

  const handleSaveDraft = async () => {
    if (!validate(true)) return;
    setSavingDraft(true); setMsg("");
    try {
      if (editingDraftId) {
        await axios.patch(`${API}/memos/${editingDraftId}`, buildPayload(true));
        setMsg("Draft updated.");
      } else {
        await axios.post(`${API}/memos`, buildPayload(true));
        setMsg("Draft saved.");
      }
      resetForm();
      fetchDrafts();
    } catch { setMsg("Failed to save draft."); }
    setSavingDraft(false);
  };

  const loadDraftIntoForm = (d: Memo) => {
    setEditingDraftId(d.id);
    setForm({
      title: d.title,
      content: d.content,
      target_type: d.target_type,
      target_stage: d.target_type === "stage" ? (d.target_value || "") : "",
      selected_teacher_ids: d.target_type === "teachers"
        ? (d.target_value || "").split(",").map(s => s.trim()).filter(Boolean)
        : [],
    });
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleForward = (m: Memo) => {
    setEditingDraftId(null);
    setForm({
      title: m.title,
      content: m.content,
      target_type: "all",
      target_stage: "",
      selected_teacher_ids: [],
    });
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteDraft = async (id: string) => {
    if (!confirm("Delete this draft?")) return;
    try {
      await axios.delete(`${API}/memos/${id}`);
      setDrafts(prev => prev.filter(d => d.id !== id));
      if (editingDraftId === id) resetForm();
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this memo?")) return;
    try {
      await axios.delete(`${API}/memos/${id}`);
      setMemos(prev => prev.filter(m => m.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch {}
  };

  const loadStatus = async (memo_id: string) => {
    if (expandedId === memo_id) { setExpandedId(null); return; }
    setExpandedId(memo_id);
    if (statusData[memo_id]) return;
    setLoadingStatus(memo_id);
    try {
      const r = await axios.get(`${API}/memos/${memo_id}/status?academic_year=${academicYear}`);
      setStatusData(prev => ({ ...prev, [memo_id]: r.data || [] }));
    } catch {}
    setLoadingStatus(null);
  };

  const toggleTeacher = (id: string) => {
    setForm(prev => ({
      ...prev,
      selected_teacher_ids: prev.selected_teacher_ids.includes(id)
        ? prev.selected_teacher_ids.filter(x => x !== id)
        : [...prev.selected_teacher_ids, id],
    }));
  };

  const targetLabel = (m: Memo) => {
    if (m.target_type === "all") return "All Teachers";
    if (m.target_type === "stage") return `Stage: ${m.target_value}`;
    if (m.target_type === "teachers") {
      const count = (m.target_value || "").split(",").filter(Boolean).length;
      return `${count} Teacher${count !== 1 ? "s" : ""}`;
    }
    return m.target_type;
  };

  const fmt = (d: string | null) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

  const filteredTeachers = teachers.filter(t =>
    !teacherSearch || t.name.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Memos</h1>
        <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm">
          {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* ── COMPOSE FORM ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-700 mb-4">
          {editingDraftId ? "Edit Draft" : "Compose Memo"}
          {editingDraftId && (
            <button onClick={resetForm} className="ml-3 text-xs text-gray-400 hover:text-gray-600 font-normal">✕ cancel</button>
          )}
        </h2>
        <div className="space-y-3">

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Title</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Memo title..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Content</label>
            <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder="Write your memo here..." rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-2 block">Send To</label>
            <div className="flex flex-wrap gap-4">
              {[{ value: "all", label: "All Teachers" }, { value: "stage", label: "By Stage" }, { value: "teachers", label: "Selected Teachers" }].map(opt => (
                <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input type="radio" name="target_type" value={opt.value} checked={form.target_type === opt.value}
                    onChange={() => setForm(p => ({ ...p, target_type: opt.value, target_stage: "", selected_teacher_ids: [] }))}
                    className="accent-indigo-600" />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {form.target_type === "stage" && (
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Select Stage</label>
              <select value={form.target_stage} onChange={e => setForm(p => ({ ...p, target_stage: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                <option value="">-- Select Stage --</option>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {form.target_type === "teachers" && (
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">
                Select Teachers ({form.selected_teacher_ids.length} selected)
              </label>
              <input value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)}
                placeholder="Search teachers..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {filteredTeachers.length === 0 && <p className="text-xs text-gray-400 p-3">No teachers found</p>}
                {filteredTeachers.map(t => (
                  <label key={t.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-indigo-50 cursor-pointer">
                    <input type="checkbox" checked={form.selected_teacher_ids.includes(t.id)}
                      onChange={() => toggleTeacher(t.id)} className="accent-indigo-600" />
                    <span className="text-xs text-gray-700">{t.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {msg && (
            <p className={`text-xs font-medium ${msg.includes("success") || msg.includes("saved") || msg.includes("updated") ? "text-green-600" : "text-red-500"}`}>{msg}</p>
          )}

          <div className="flex gap-2">
            <button onClick={handleSend} disabled={sending || savingDraft}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all disabled:opacity-60">
              {sending ? "Sending..." : editingDraftId ? "Update & Send" : "Send Memo"}
            </button>
            <button onClick={handleSaveDraft} disabled={sending || savingDraft}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-5 py-2 rounded-lg transition-all disabled:opacity-60 border border-gray-300">
              {savingDraft ? "Saving..." : editingDraftId ? "Update Draft" : "Save as Draft"}
            </button>
          </div>
        </div>
      </div>

      {/* ── DRAFTS ── */}
      {drafts.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 mb-5 shadow-sm">
          <button
            onClick={() => setDraftsOpen(o => !o)}
            className="w-full px-5 py-3 flex items-center justify-between text-left"
          >
            <span className="text-sm font-bold text-amber-800">Drafts ({drafts.length})</span>
            <span className="text-amber-600 text-xs">{draftsOpen ? "▲ Hide" : "▼ Show"}</span>
          </button>
          {draftsOpen && (
            <div className="divide-y divide-amber-200 border-t border-amber-200">
              {drafts.map(d => (
                <div key={d.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{d.title || <span className="italic text-gray-400">Untitled</span>}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{d.content}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{fmt(d.created_at)} · {targetLabel(d)}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => loadDraftIntoForm(d)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-50">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteDraft(d.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded border border-red-200 hover:bg-red-50">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SENT MEMOS ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-700">Sent Memos ({memos.length})</h2>
        </div>
        {memos.length === 0 ? (
          <p className="text-sm text-gray-400 p-5">No memos sent for {academicYear}.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {memos.map(m => {
              const rows = statusData[m.id] || [];
              const readCount = rows.filter(r => r.is_read).length;
              const total = rows.length;
              const isExpanded = expandedId === m.id;

              return (
                <div key={m.id}>
                  {/* Memo row */}
                  <div className="px-5 py-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-gray-800">{m.title}</span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{targetLabel(m)}</span>
                        {total > 0
                          ? <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${readCount === total ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{readCount} / {total} read</span>
                          : <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{m.read_count} read</span>
                        }
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">{m.content}</p>
                      <p className="text-xs text-gray-400 mt-1">{fmt(m.created_at)}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => loadStatus(m.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-50 transition-all">
                        {isExpanded ? "Hide" : "View Status"}
                      </button>
                      <button onClick={() => handleForward(m)}
                        className="text-xs text-gray-600 hover:text-gray-800 font-medium px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-all">
                        Forward
                      </button>
                      <button onClick={() => handleDelete(m.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition-all">
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Status table */}
                  {isExpanded && (
                    <div className="px-5 pb-5">
                      {loadingStatus === m.id ? (
                        <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
                          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                          Loading status...
                        </div>
                      ) : rows.length === 0 ? (
                        <p className="text-xs text-gray-400 italic py-2">No recipient data available.</p>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-3 py-2 font-semibold text-gray-600">#</th>
                                <th className="text-left px-3 py-2 font-semibold text-gray-600">Teacher</th>
                                <th className="text-left px-3 py-2 font-semibold text-gray-600">Sent At</th>
                                <th className="text-left px-3 py-2 font-semibold text-gray-600">Status</th>
                                <th className="text-left px-3 py-2 font-semibold text-gray-600">Read At</th>
                                <th className="text-left px-3 py-2 font-semibold text-gray-600">Reply</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...rows]
                                .sort((a, b) => (a.is_read === b.is_read ? 0 : a.is_read ? 1 : -1))
                                .map((row, i) => (
                                  <tr key={row.teacher_id}
                                    className={`border-b border-gray-100 last:border-0 ${row.is_read ? "bg-green-50" : "bg-amber-50"}`}>
                                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                                    <td className="px-3 py-2 font-medium text-gray-800">{row.teacher_name}</td>
                                    <td className="px-3 py-2 text-gray-500">{fmtDate(row.sent_at)}</td>
                                    <td className="px-3 py-2">
                                      {row.is_read
                                        ? <span className="inline-flex items-center gap-1 text-green-700 font-semibold"><span>✓</span> Read</span>
                                        : <span className="inline-flex items-center gap-1 text-amber-600 font-semibold"><span>⏳</span> Unread</span>
                                      }
                                    </td>
                                    <td className="px-3 py-2 text-gray-500">{fmtDate(row.read_at)}</td>
                                    <td className="px-3 py-2 text-gray-600 italic max-w-xs truncate">
                                      {row.reply || <span className="text-gray-300 not-italic">—</span>}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                          <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
                            {rows.filter(r => r.is_read).length} of {rows.length} teachers have read this memo
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
