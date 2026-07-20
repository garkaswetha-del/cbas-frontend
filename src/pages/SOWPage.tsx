import { useState, useEffect, useCallback } from "react";
import { currentAcademicYear } from "../utils/academicYear";
import AcademicYearSelect from "../components/AcademicYearSelect";

const API = "https://cbas-backend-production.up.railway.app";

interface Lp { id: string; lp_number: number; lp_name: string; }
interface Block {
  id: string; block_number: number; block_name: string;
  ahm_comment: string | null; lps: Lp[];
}
interface SowData { track: "exceed" | "ncert"; blocks: Block[]; status: any; }

// ── helpers ──────────────────────────────────────────────────────────────────

function gradeNum(grade: string): number {
  const m = grade.match(/\d+/);
  return m ? parseInt(m[0]) : 0;
}

function isSOWGrade(grade: string): boolean {
  const n = gradeNum(grade);
  return n >= 1 && n <= 10;
}

// ── Teacher SOW ───────────────────────────────────────────────────────────────

interface TeacherSOWProps {
  user: any;
  mappings: any;
  academicYear: string;
}

export function TeacherSOW({ user, mappings, academicYear }: TeacherSOWProps) {
  // Build subject list from mappings (teacher subjects)
  type SubjectEntry = { grade: string; section: string; subject: string };
  const subjects: SubjectEntry[] = [];
  if (mappings?.mappings) {
    for (const m of mappings.mappings) {
      if (isSOWGrade(m.grade)) {
        subjects.push({ grade: m.grade, section: m.section, subject: m.subject });
      }
    }
  }

  const [selIdx, setSelIdx] = useState(0);
  const [sow, setSow] = useState<SowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const sel = subjects[selIdx];

  const loadSOW = useCallback(async () => {
    if (!sel || !user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/sow?teacher_id=${user.id}&academic_year=${encodeURIComponent(academicYear)}&grade=${encodeURIComponent(sel.grade)}&section=${encodeURIComponent(sel.section)}&subject=${encodeURIComponent(sel.subject)}`
      );
      setSow(await res.json());
    } finally {
      setLoading(false);
    }
  }, [sel?.grade, sel?.section, sel?.subject, user?.id, academicYear]);

  useEffect(() => { loadSOW(); }, [loadSOW]);

  async function saveBlock(id: string, block_name: string) {
    await fetch(`${API}/sow/block/save`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, block_name }),
    });
  }

  async function saveLp(id: string, lp_name: string) {
    await fetch(`${API}/sow/lp/save`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, lp_name }),
    });
  }

  async function addBlock() {
    if (!sel || !user?.id) return;
    const res = await fetch(`${API}/sow/block/add`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacher_id: user.id, academic_year: academicYear, grade: sel.grade, section: sel.section, subject: sel.subject }),
    });
    const newBlock = await res.json();
    setSow(prev => prev ? { ...prev, blocks: [...prev.blocks, newBlock] } : prev);
  }

  async function deleteBlock(id: string) {
    if (!confirm("Delete this chapter and all its LPs?")) return;
    await fetch(`${API}/sow/block/${id}`, { method: "DELETE" });
    setSow(prev => prev ? { ...prev, blocks: prev.blocks.filter(b => b.id !== id) } : prev);
  }

  async function addLp(block_id: string) {
    const res = await fetch(`${API}/sow/lp/add`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ block_id }),
    });
    const newLp = await res.json();
    setSow(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        blocks: prev.blocks.map(b =>
          b.id === block_id ? { ...b, lps: [...b.lps, newLp] } : b
        ),
      };
    });
  }

  async function deleteLp(blockId: string, lpId: string) {
    await fetch(`${API}/sow/lp/${lpId}`, { method: "DELETE" });
    setSow(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        blocks: prev.blocks.map(b =>
          b.id === blockId ? { ...b, lps: b.lps.filter(l => l.id !== lpId) } : b
        ),
      };
    });
  }

  async function handleSubmit() {
    if (!sel || !user?.id) return;
    setSubmitting(true);
    try {
      await fetch(`${API}/sow/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacher_id: user.id, academic_year: academicYear, grade: sel.grade, section: sel.section, subject: sel.subject }),
      });
      await loadSOW();
    } finally {
      setSubmitting(false);
    }
  }

  if (subjects.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 text-sm">
        No SOW-eligible subjects assigned (Grades 1–10).
      </div>
    );
  }

  const status = sow?.status?.status ?? "draft";
  const canEdit = status === "draft" || status === "needs_revision";

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Scheme of Work</h2>

      {/* Subject tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {subjects.map((s, i) => (
          <button
            key={i}
            onClick={() => { setSelIdx(i); setSow(null); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
              i === selIdx
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 border-gray-200 hover:border-indigo-400"
            }`}
          >
            {s.subject}
            <span className="text-xs ml-1 opacity-75">{s.grade} {s.section}</span>
          </button>
        ))}
      </div>

      {/* Status bar */}
      {sow && (
        <div className="flex items-center justify-between mb-4">
          <StatusBadge status={status} />
          {canEdit && status !== "submitted" && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit for Review"}
            </button>
          )}
          {status === "submitted" && (
            <span className="text-sm text-gray-500 italic">Awaiting review</span>
          )}
        </div>
      )}

      {loading && <div className="text-center py-10 text-gray-400 text-sm">Loading SOW…</div>}

      {!loading && sow && (
        sow.track === "exceed"
          ? <ExceedGrid blocks={sow.blocks} canEdit={canEdit} onSaveBlock={saveBlock} onSaveLp={saveLp} />
          : <NcertGrid
              blocks={sow.blocks} canEdit={canEdit}
              onSaveBlock={saveBlock} onSaveLp={saveLp}
              onAddBlock={addBlock} onDeleteBlock={deleteBlock}
              onAddLp={addLp} onDeleteLp={deleteLp}
            />
      )}
    </div>
  );
}

// ── Exceed grid: 24 blocks × 4 LPs ──────────────────────────────────────────

function ExceedGrid({ blocks, canEdit, onSaveBlock, onSaveLp }: {
  blocks: Block[]; canEdit: boolean;
  onSaveBlock: (id: string, val: string) => void;
  onSaveLp: (id: string, val: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-indigo-50">
            <th className="border border-gray-200 px-2 py-2 text-left w-10 text-xs text-gray-500">#</th>
            <th className="border border-gray-200 px-2 py-2 text-left text-xs text-gray-500 w-52">Block Name</th>
            <th className="border border-gray-200 px-2 py-2 text-left text-xs text-gray-500">LP 1</th>
            <th className="border border-gray-200 px-2 py-2 text-left text-xs text-gray-500">LP 2</th>
            <th className="border border-gray-200 px-2 py-2 text-left text-xs text-gray-500">LP 3</th>
            <th className="border border-gray-200 px-2 py-2 text-left text-xs text-gray-500">LP 4</th>
          </tr>
        </thead>
        <tbody>
          {blocks.map(b => {
            const lps = [...b.lps].sort((a, z) => a.lp_number - z.lp_number);
            return (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="border border-gray-200 px-2 py-1 text-gray-400 text-xs text-center">{b.block_number}</td>
                <td className="border border-gray-200 px-1 py-1">
                  <AutoInput id={b.id} value={b.block_name} disabled={!canEdit} onBlur={onSaveBlock} />
                  {b.ahm_comment && <AhmComment text={b.ahm_comment} />}
                </td>
                {lps.map(lp => (
                  <td key={lp.id} className="border border-gray-200 px-1 py-1">
                    <AutoInput id={lp.id} value={lp.lp_name} disabled={!canEdit} onBlur={onSaveLp} />
                  </td>
                ))}
                {Array.from({ length: Math.max(0, 4 - lps.length) }).map((_, i) => (
                  <td key={`empty-${i}`} className="border border-gray-200" />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── NCERT grid: flexible chapters + LPs ──────────────────────────────────────

function NcertGrid({ blocks, canEdit, onSaveBlock, onSaveLp, onAddBlock, onDeleteBlock, onAddLp, onDeleteLp }: {
  blocks: Block[]; canEdit: boolean;
  onSaveBlock: (id: string, val: string) => void;
  onSaveLp: (id: string, val: string) => void;
  onAddBlock: () => void;
  onDeleteBlock: (id: string) => void;
  onAddLp: (blockId: string) => void;
  onDeleteLp: (blockId: string, lpId: string) => void;
}) {
  return (
    <div className="space-y-4">
      {blocks.map(b => {
        const lps = [...b.lps].sort((a, z) => a.lp_number - z.lp_number);
        return (
          <div key={b.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-400 w-6">Ch {b.block_number}</span>
              <AutoInput id={b.id} value={b.block_name} disabled={!canEdit} onBlur={onSaveBlock}
                placeholder="Chapter name…" className="flex-1" />
              {canEdit && (
                <button onClick={() => onDeleteBlock(b.id)} className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
              )}
            </div>
            {b.ahm_comment && <AhmComment text={b.ahm_comment} />}
            <div className="ml-8 space-y-1">
              {lps.map((lp, idx) => (
                <div key={lp.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-8">LP {lp.lp_number}</span>
                  <AutoInput id={lp.id} value={lp.lp_name} disabled={!canEdit} onBlur={onSaveLp}
                    placeholder="LP name…" className="flex-1" />
                  {canEdit && lps.length > 1 && (
                    <button onClick={() => onDeleteLp(b.id, lp.id)} className="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
                  )}
                </div>
              ))}
              {canEdit && (
                <button onClick={() => onAddLp(b.id)} className="text-xs text-indigo-500 hover:text-indigo-700 mt-1">
                  + Add LP
                </button>
              )}
            </div>
          </div>
        );
      })}
      {canEdit && (
        <button onClick={onAddBlock} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition">
          + Add Chapter
        </button>
      )}
    </div>
  );
}

// ── Auto-saving input ─────────────────────────────────────────────────────────

function AutoInput({ id, value, disabled, onBlur, placeholder, className = "" }: {
  id: string; value: string; disabled: boolean;
  onBlur: (id: string, val: string) => void;
  placeholder?: string; className?: string;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);
  return (
    <input
      type="text"
      value={local}
      disabled={disabled}
      placeholder={placeholder}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onBlur(id, local); }}
      className={`w-full px-2 py-1 text-sm border border-transparent rounded focus:outline-none focus:border-indigo-300 bg-transparent disabled:text-gray-600 ${className}`}
    />
  );
}

function AhmComment({ text }: { text: string }) {
  return (
    <div className="mt-1 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
      AHM: {text}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft:          { label: "Draft",          cls: "bg-gray-100 text-gray-600" },
    submitted:      { label: "Submitted",      cls: "bg-blue-100 text-blue-700" },
    approved:       { label: "Approved ✓",     cls: "bg-green-100 text-green-700" },
    needs_revision: { label: "Needs Revision", cls: "bg-yellow-100 text-yellow-700" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>{label}</span>;
}

// ── Admin / AHM SOW overview ──────────────────────────────────────────────────

export function AdminSOW({ user }: { user: any }) {
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"teacher" | "grade" | "subject">("teacher");
  const [selected, setSelected] = useState<any | null>(null);
  const [detailSow, setDetailSow] = useState<SowData | null>(null);
  const [reviewStatus, setReviewStatus] = useState("approved");
  const [blockComments, setBlockComments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/sow/all?academic_year=${encodeURIComponent(academicYear)}`)
      .then(r => r.json())
      .then(data => setRows(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [academicYear]);

  async function openDetail(row: any) {
    setSelected(row);
    setBlockComments({});
    const res = await fetch(
      `${API}/sow?teacher_id=${row.teacher_id}&academic_year=${encodeURIComponent(academicYear)}&grade=${encodeURIComponent(row.grade)}&section=${encodeURIComponent(row.section)}&subject=${encodeURIComponent(row.subject)}`
    );
    setDetailSow(await res.json());
  }

  async function saveReview() {
    if (!selected || !detailSow?.status) return;
    setSaving(true);
    try {
      const bc = Object.entries(blockComments)
        .filter(([, v]) => v.trim())
        .map(([block_id, comment]) => ({ block_id, comment }));
      await fetch(`${API}/sow/review/${detailSow.status.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: reviewStatus, reviewed_by: String(user.id), block_comments: bc }),
      });
      // refresh rows
      const r = await fetch(`${API}/sow/all?academic_year=${encodeURIComponent(academicYear)}`);
      setRows(await r.json());
      setSelected(null);
      setDetailSow(null);
    } finally {
      setSaving(false);
    }
  }

  // Group rows by chosen view mode
  const grouped = new Map<string, any[]>();
  for (const row of rows) {
    let key = "";
    if (viewMode === "teacher") key = row.teacher_name ?? row.teacher_id;
    else if (viewMode === "grade") key = row.grade;
    else key = row.subject;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h2 className="text-xl font-bold text-gray-800 flex-1">Scheme of Work — Overview</h2>
        <AcademicYearSelect value={academicYear} onChange={setAcademicYear} />
      </div>

      {/* View mode tabs */}
      <div className="flex gap-2 mb-4">
        {(["teacher", "grade", "subject"] as const).map(m => (
          <button key={m} onClick={() => setViewMode(m)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${viewMode === m ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-400"}`}>
            By {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>}

      {!loading && rows.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">No SOW entries for {academicYear}.</div>
      )}

      {!loading && rows.length > 0 && (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([group, groupRows]) => (
            <div key={group} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 font-medium text-sm text-gray-700">{group}</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    {viewMode !== "teacher" && <th className="px-4 py-2 text-left">Teacher</th>}
                    {viewMode !== "grade" && <th className="px-4 py-2 text-left">Grade / Section</th>}
                    {viewMode !== "subject" && <th className="px-4 py-2 text-left">Subject</th>}
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Progress</th>
                    <th className="px-4 py-2 text-left">Last Updated</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {groupRows.map((row, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      {viewMode !== "teacher" && <td className="px-4 py-2">{row.teacher_name ?? "—"}</td>}
                      {viewMode !== "grade" && <td className="px-4 py-2">{row.grade} {row.section}</td>}
                      {viewMode !== "subject" && <td className="px-4 py-2">{row.subject}</td>}
                      <td className="px-4 py-2"><StatusBadge status={row.status ?? "draft"} /></td>
                      <td className="px-4 py-2 text-xs text-gray-500">{row.filled_blocks}/{row.block_count} blocks</td>
                      <td className="px-4 py-2 text-xs text-gray-400">{row.last_updated ? new Date(row.last_updated).toLocaleDateString() : "—"}</td>
                      <td className="px-4 py-2">
                        <button onClick={() => openDetail(row)}
                          className="text-xs px-2 py-1 border border-indigo-300 text-indigo-600 rounded hover:bg-indigo-50">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Detail drawer */}
      {selected && detailSow && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black bg-opacity-40" onClick={() => { setSelected(null); setDetailSow(null); }} />
          <div className="relative ml-auto w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div>
                <p className="font-semibold text-gray-800">{selected.teacher_name} — {selected.subject}</p>
                <p className="text-xs text-gray-500">{selected.grade} {selected.section} · {academicYear}</p>
              </div>
              <button onClick={() => { setSelected(null); setDetailSow(null); }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {/* Read-only SOW view */}
              {detailSow.track === "exceed" ? (
                <ExceedGrid blocks={detailSow.blocks} canEdit={false} onSaveBlock={() => {}} onSaveLp={() => {}} />
              ) : (
                <NcertGrid blocks={detailSow.blocks} canEdit={false}
                  onSaveBlock={() => {}} onSaveLp={() => {}}
                  onAddBlock={() => {}} onDeleteBlock={() => {}} onAddLp={() => {}} onDeleteLp={() => {}} />
              )}

              {/* Review panel — only if submitted */}
              {detailSow.status && (
                <div className="mt-6 border-t border-gray-200 pt-4">
                  <h3 className="font-semibold text-gray-700 mb-3">Review</h3>

                  {/* Per-block comments */}
                  <div className="space-y-2 mb-4">
                    {detailSow.blocks.map(b => (
                      <div key={b.id} className="flex items-start gap-2">
                        <span className="text-xs text-gray-500 pt-2 w-24 flex-shrink-0">
                          {detailSow.track === "exceed" ? `Block ${b.block_number}` : `Ch ${b.block_number}`}
                        </span>
                        <input
                          type="text"
                          placeholder="Comment on this block (optional)"
                          value={blockComments[b.id] ?? b.ahm_comment ?? ""}
                          onChange={e => setBlockComments(prev => ({ ...prev, [b.id]: e.target.value }))}
                          className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={reviewStatus}
                      onChange={e => setReviewStatus(e.target.value)}
                      className="border border-gray-200 rounded px-2 py-1.5 text-sm"
                    >
                      <option value="approved">Approve</option>
                      <option value="needs_revision">Needs Revision</option>
                    </select>
                    <button
                      onClick={saveReview}
                      disabled={saving}
                      className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save Review"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Default export (for admin/AHM route) ─────────────────────────────────────

export default function SOWPage({ user }: { user?: any }) {
  return <AdminSOW user={user} />;
}
