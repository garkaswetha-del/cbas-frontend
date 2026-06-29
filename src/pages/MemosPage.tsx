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
  created_by: string | null;
  academic_year: string | null;
  created_at: string;
  read_count: number;
}

interface Teacher {
  id: string;
  name: string;
  assigned_classes?: string[];
}

interface MemoRead {
  id: string;
  teacher_name: string;
  read_at: string;
}

export default function MemosPage() {
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [memos, setMemos] = useState<Memo[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reads, setReads] = useState<Record<string, MemoRead[]>>({});
  const [loadingReads, setLoadingReads] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    title: "",
    content: "",
    target_type: "all",
    target_stage: "",
    selected_teacher_ids: [] as string[],
  });

  const [teacherSearch, setTeacherSearch] = useState("");

  useEffect(() => {
    fetchMemos();
    fetchTeachers();
  }, [academicYear]);

  const fetchMemos = async () => {
    try {
      const r = await axios.get(`${API}/memos?academic_year=${academicYear}`);
      setMemos(r.data || []);
    } catch {}
  };

  const fetchTeachers = async () => {
    try {
      const r = await axios.get(`${API}/observation/teachers?academic_year=${academicYear}`);
      setTeachers(r.data || []);
    } catch {}
  };

  const loadReads = async (memo_id: string) => {
    if (expandedId === memo_id) { setExpandedId(null); return; }
    setExpandedId(memo_id);
    if (reads[memo_id]) return;
    setLoadingReads(memo_id);
    try {
      const r = await axios.get(`${API}/memos/${memo_id}/reads`);
      setReads(prev => ({ ...prev, [memo_id]: r.data || [] }));
    } catch {}
    setLoadingReads(null);
  };

  const handleSend = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setMsg("Title and content are required."); return;
    }
    if (form.target_type === "stage" && !form.target_stage) {
      setMsg("Please select a stage."); return;
    }
    if (form.target_type === "teachers" && form.selected_teacher_ids.length === 0) {
      setMsg("Please select at least one teacher."); return;
    }
    setSending(true); setMsg("");
    try {
      const payload: any = {
        title: form.title.trim(),
        content: form.content.trim(),
        target_type: form.target_type,
        academic_year: academicYear,
      };
      if (form.target_type === "stage") payload.target_value = form.target_stage;
      if (form.target_type === "teachers") payload.target_value = form.selected_teacher_ids.join(",");

      await axios.post(`${API}/memos`, payload);
      setForm({ title: "", content: "", target_type: "all", target_stage: "", selected_teacher_ids: [] });
      setTeacherSearch("");
      setMsg("Memo sent successfully.");
      fetchMemos();
    } catch {
      setMsg("Failed to send memo.");
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this memo?")) return;
    try {
      await axios.delete(`${API}/memos/${id}`);
      setMemos(prev => prev.filter(m => m.id !== id));
    } catch {}
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
      return `Selected (${count} teacher${count !== 1 ? "s" : ""})`;
    }
    return m.target_type;
  };

  const filteredTeachers = teachers.filter(t =>
    !teacherSearch || t.name.toLowerCase().includes(teacherSearch.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Memos</h1>
        <select
          value={academicYear}
          onChange={e => setAcademicYear(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-sm"
        >
          {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Compose Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
        <h2 className="text-sm font-bold text-gray-700 mb-4">Compose Memo</h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Title</label>
            <input
              value={form.title}
              onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Memo title..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1 block">Content</label>
            <textarea
              value={form.content}
              onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Write your memo here..."
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium mb-2 block">Send To</label>
            <div className="flex gap-4">
              {[
                { value: "all", label: "All Teachers" },
                { value: "stage", label: "By Stage" },
                { value: "teachers", label: "Selected Teachers" },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer text-sm">
                  <input
                    type="radio"
                    name="target_type"
                    value={opt.value}
                    checked={form.target_type === opt.value}
                    onChange={() => setForm(prev => ({ ...prev, target_type: opt.value, target_stage: "", selected_teacher_ids: [] }))}
                    className="accent-indigo-600"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {form.target_type === "stage" && (
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Select Stage</label>
              <select
                value={form.target_stage}
                onChange={e => setForm(prev => ({ ...prev, target_stage: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
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
              <input
                value={teacherSearch}
                onChange={e => setTeacherSearch(e.target.value)}
                placeholder="Search teachers..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs mb-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {filteredTeachers.length === 0 && (
                  <p className="text-xs text-gray-400 p-3">No teachers found</p>
                )}
                {filteredTeachers.map(t => (
                  <label key={t.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-indigo-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.selected_teacher_ids.includes(t.id)}
                      onChange={() => toggleTeacher(t.id)}
                      className="accent-indigo-600"
                    />
                    <span className="text-xs text-gray-700">{t.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {msg && (
            <p className={`text-xs font-medium ${msg.includes("success") ? "text-green-600" : "text-red-500"}`}>{msg}</p>
          )}

          <button
            onClick={handleSend}
            disabled={sending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all disabled:opacity-60"
          >
            {sending ? "Sending..." : "Send Memo"}
          </button>
        </div>
      </div>

      {/* Sent Memos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-700">Sent Memos ({memos.length})</h2>
        </div>
        {memos.length === 0 ? (
          <p className="text-sm text-gray-400 p-5">No memos sent for {academicYear}.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {memos.map(m => (
              <div key={m.id}>
                <div className="px-5 py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold text-gray-800">{m.title}</span>
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{targetLabel(m)}</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{m.read_count} read</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{m.content}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(m.created_at).toLocaleString("en-IN")}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => loadReads(m.id)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded border border-indigo-200 hover:bg-indigo-50 transition-all"
                    >
                      {expandedId === m.id ? "Hide" : "View Reads"}
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {expandedId === m.id && (
                  <div className="px-5 pb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Read by:</p>
                      {loadingReads === m.id ? (
                        <p className="text-xs text-gray-400">Loading...</p>
                      ) : (reads[m.id] || []).length === 0 ? (
                        <p className="text-xs text-gray-400">No one has read this memo yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {(reads[m.id] || []).map(r => (
                            <span key={r.id} className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 text-gray-700">
                              {r.teacher_name} · {new Date(r.read_at).toLocaleDateString("en-IN")}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
