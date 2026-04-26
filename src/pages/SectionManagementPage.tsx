import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = "https://cbas-backend-production.up.railway.app";

const GRADES = [
  "Pre-KG","LKG","UKG",
  "Grade 1","Grade 2","Grade 3","Grade 4","Grade 5",
  "Grade 6","Grade 7","Grade 8","Grade 9","Grade 10",
];

const ACADEMIC_YEARS = ["2025-26","2024-25","2026-27"];

interface SectionRow {
  id: string;
  grade: string;
  name: string;
  academic_year: string;
  is_active: boolean;
  display_order: number;
  student_count: number;
}

interface RenameResult {
  old_name: string;
  new_name: string;
  grade: string;
  updated: Record<string, number>;
}

export default function SectionManagementPage() {
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState("Grade 1");
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [newSection, setNewSection] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [renameTarget, setRenameTarget] = useState<SectionRow | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameResult, setRenameResult] = useState<RenameResult | null>(null);
  const [seeding, setSeeding] = useState(false);
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fetchSections(); }, [academicYear]);

  const showMsg = (text: string, ok = true) => {
    if (msgTimer.current) clearTimeout(msgTimer.current);
    setMsg({ text, ok });
    msgTimer.current = setTimeout(() => setMsg(null), 4000);
  };

  const fetchSections = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/sections/counts?academic_year=${academicYear}`);
      setSections(r.data || []);
    } catch {
      // If sections table empty, fall back to student-derived list and offer seed
      try {
        const r = await axios.get(`${API}/students/sections/all`);
        const map: Record<string, string[]> = r.data || {};
        const rows: SectionRow[] = [];
        for (const [grade, names] of Object.entries(map)) {
          (names as string[]).forEach(name =>
            rows.push({ id: '', grade, name, academic_year: academicYear, is_active: true, display_order: 0, student_count: 0 })
          );
        }
        setSections(rows);
      } catch { setSections([]); }
    }
    setLoading(false);
  };

  const seedSections = async () => {
    setSeeding(true);
    try {
      const r = await axios.post(`${API}/sections/seed`, { academic_year: academicYear });
      showMsg(`Seeded ${r.data.created} new section(s) from student records (${r.data.skipped} already existed)`);
      await fetchSections();
    } catch { showMsg("Failed to seed sections", false); }
    setSeeding(false);
  };

  const normalizeSections = async () => {
    try {
      await axios.post(`${API}/sections/normalize`);
      showMsg("All section strings normalized to uppercase");
      await fetchSections();
    } catch { showMsg("Normalize failed", false); }
  };

  const addSection = async () => {
    const name = newSection.trim().toUpperCase();
    if (!name) { showMsg("Enter a section name", false); return; }
    const exists = sections.some(s => s.grade === selectedGrade && s.name === name && s.academic_year === academicYear);
    if (exists) { showMsg(`Section ${name} already exists in ${selectedGrade}`, false); return; }

    setSaving(true);
    try {
      await axios.post(`${API}/sections`, { grade: selectedGrade, name, academic_year: academicYear });
      showMsg(`Section ${name} added to ${selectedGrade}`);
      setNewSection("");
      await fetchSections();
    } catch (e: any) {
      showMsg(e.response?.data?.message || "Failed to add section", false);
    }
    setSaving(false);
  };

  const deactivateSection = async (sec: SectionRow) => {
    if (!sec.id) { showMsg("Seed sections first to enable deactivation", false); return; }
    if (!confirm(`Deactivate section ${sec.name} in ${sec.grade}? It will be hidden from dropdowns.`)) return;
    try {
      await axios.patch(`${API}/sections/${sec.id}/deactivate`);
      showMsg(`${sec.name} deactivated`);
      await fetchSections();
    } catch (e: any) {
      showMsg(e.response?.data?.message || "Cannot deactivate", false);
    }
  };

  const reactivateSection = async (sec: SectionRow) => {
    if (!sec.id) return;
    try {
      await axios.patch(`${API}/sections/${sec.id}/reactivate`);
      showMsg(`${sec.name} reactivated`);
      await fetchSections();
    } catch { showMsg("Failed to reactivate", false); }
  };

  const deleteSection = async (sec: SectionRow) => {
    if (!sec.id) { showMsg("Seed sections first to enable deletion", false); return; }
    if (!confirm(`Permanently delete section ${sec.name} from ${sec.grade}? This is blocked if any records reference it.`)) return;
    try {
      await axios.delete(`${API}/sections/${sec.id}`);
      showMsg(`${sec.name} deleted`);
      await fetchSections();
    } catch (e: any) {
      showMsg(e.response?.data?.message || "Cannot delete — records still reference this section", false);
    }
  };

  const startRename = (sec: SectionRow) => {
    if (!sec.id) { showMsg("Seed sections first to enable rename", false); return; }
    setRenameTarget(sec);
    setRenameValue(sec.name);
    setRenameResult(null);
  };

  const submitRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    const newName = renameValue.trim().toUpperCase();
    if (newName === renameTarget.name) { setRenameTarget(null); return; }
    setSaving(true);
    try {
      const r = await axios.patch(`${API}/sections/${renameTarget.id}/rename`, { name: newName });
      setRenameResult(r.data);
      setRenameTarget(null);
      await fetchSections();
    } catch (e: any) {
      showMsg(e.response?.data?.message || "Rename failed", false);
    }
    setSaving(false);
  };

  const gradeSections = sections.filter(s => s.grade === selectedGrade);
  const activeSections = gradeSections.filter(s => s.is_active);
  const inactiveSections = gradeSections.filter(s => !s.is_active);
  const hasRealIds = sections.some(s => !!s.id);
  const totalActive = sections.filter(s => s.is_active).length;

  return (
    <div className="p-3 sm:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Section Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {hasRealIds
              ? "Sections stored in database. Rename cascades to all modules."
              : "Sections derived from student records. Seed to enable full management."}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            {ACADEMIC_YEARS.map(y => <option key={y}>{y}</option>)}
          </select>
          {!hasRealIds && (
            <button onClick={seedSections} disabled={seeding}
              className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium">
              {seeding ? "Seeding..." : "Seed from Students"}
            </button>
          )}
          {hasRealIds && (
            <button onClick={normalizeSections}
              className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 font-medium">
              Normalize Case
            </button>
          )}
        </div>
      </div>

      {/* Message bar */}
      {msg && (
        <div className={`mb-4 px-4 py-2 rounded text-sm border ${msg.ok ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>
          {msg.text}
        </div>
      )}

      {/* Rename cascade result */}
      {renameResult && (
        <div className="mb-4 px-4 py-3 rounded border bg-blue-50 border-blue-300 text-blue-900 text-sm">
          <p className="font-semibold mb-1">Renamed "{renameResult.old_name}" → "{renameResult.new_name}" in {renameResult.grade}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs mt-1">
            {Object.entries(renameResult.updated).map(([table, count]) =>
              count > 0 ? <span key={table}>{table.replace(/_/g, ' ')}: {count}</span> : null
            )}
          </div>
          <button onClick={() => setRenameResult(null)} className="mt-2 text-xs text-blue-600 underline">Dismiss</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-indigo-500">
          <p className="text-xs text-gray-500">Total Grades</p>
          <p className="text-2xl font-bold text-indigo-700">{GRADES.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
          <p className="text-xs text-gray-500">Grades with Sections</p>
          <p className="text-2xl font-bold text-green-700">{new Set(sections.filter(s=>s.is_active).map(s=>s.grade)).size}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
          <p className="text-xs text-gray-500">Active Sections</p>
          <p className="text-2xl font-bold text-blue-700">{totalActive}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-purple-500">
          <p className="text-xs text-gray-500">{selectedGrade} Sections</p>
          <p className="text-2xl font-bold text-purple-700">{activeSections.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Grade list */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-700">Grades</h2>
          </div>
          <div className="divide-y divide-gray-100 overflow-y-auto max-h-[520px]">
            {GRADES.map(grade => {
              const count = sections.filter(s => s.grade === grade && s.is_active).length;
              return (
                <button key={grade} onClick={() => setSelectedGrade(grade)}
                  className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-indigo-50 transition-colors ${selectedGrade === grade ? "bg-indigo-50 border-l-4 border-indigo-600" : ""}`}>
                  <span className={`text-sm font-medium ${selectedGrade === grade ? "text-indigo-700" : "text-gray-700"}`}>{grade}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${count > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                    {count} sections
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sections panel */}
        <div className="sm:col-span-2 space-y-4">
          {/* Add section */}
          <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
            <h2 className="text-sm font-bold text-gray-700 mb-3">Add Section to {selectedGrade}</h2>
            <div className="flex gap-3">
              <input type="text" value={newSection} onChange={e => setNewSection(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && addSection()}
                placeholder="Section name e.g. HIMALAYA"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              <button onClick={addSection} disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
                {saving ? "Adding..." : "+ Add"}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Names are auto-uppercased and persisted to the database.</p>
          </div>

          {/* Rename modal */}
          {renameTarget && (
            <div className="bg-amber-50 rounded-xl border border-amber-300 p-4">
              <h3 className="text-sm font-bold text-amber-800 mb-2">
                Rename "{renameTarget.name}" in {renameTarget.grade}
              </h3>
              <p className="text-xs text-amber-700 mb-3">
                This will update the section name in ALL modules (students, PASA, Baseline, Activities, Homework, Mappings, etc.) in a single transaction.
              </p>
              <div className="flex gap-3">
                <input type="text" value={renameValue} onChange={e => setRenameValue(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && submitRename()}
                  className="flex-1 border border-amber-400 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                  placeholder="New section name" autoFocus />
                <button onClick={submitRename} disabled={saving}
                  className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium">
                  {saving ? "Renaming..." : "Rename"}
                </button>
                <button onClick={() => setRenameTarget(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 font-medium">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Active sections list */}
          <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700">Active Sections in {selectedGrade}</h2>
              <span className="text-xs text-gray-500">{activeSections.length} sections</span>
            </div>
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : activeSections.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-2xl mb-2">📭</p>
                <p className="text-sm">No active sections for {selectedGrade}</p>
                <p className="text-xs mt-1">Add a section above, or seed from existing student data.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {activeSections.map(sec => (
                  <div key={sec.id || sec.name} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-sm font-semibold text-gray-800">{sec.name}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          {sec.student_count > 0 ? `${sec.student_count} student${sec.student_count !== 1 ? 's' : ''}` : 'No active students'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startRename(sec)}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded font-medium">
                        Rename
                      </button>
                      <button onClick={() => deactivateSection(sec)}
                        disabled={sec.student_count > 0}
                        title={sec.student_count > 0 ? "Cannot deactivate — has active students" : "Deactivate"}
                        className="text-xs text-orange-500 hover:text-orange-700 hover:bg-orange-50 px-2 py-1 rounded disabled:opacity-40 disabled:cursor-not-allowed">
                        Deactivate
                      </button>
                      <button onClick={() => deleteSection(sec)}
                        disabled={sec.student_count > 0}
                        title={sec.student_count > 0 ? "Cannot delete — has active students" : "Delete permanently"}
                        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded disabled:opacity-40 disabled:cursor-not-allowed">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inactive / deactivated sections */}
          {inactiveSections.length > 0 && (
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-bold text-gray-500">Deactivated Sections in {selectedGrade}</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {inactiveSections.map(sec => (
                  <div key={sec.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 opacity-60">
                    <span className="text-sm text-gray-500 line-through">{sec.name}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => reactivateSection(sec)}
                        className="text-xs text-green-600 hover:text-green-800 hover:bg-green-50 px-2 py-1 rounded font-medium">
                        Reactivate
                      </button>
                      <button onClick={() => deleteSection(sec)}
                        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All grades overview */}
          <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-700">All Grades Overview — {academicYear}</h2>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {GRADES.filter(g => sections.some(s => s.grade === g && s.is_active)).map(grade => (
                  <div key={grade} className="flex items-start gap-3">
                    <span className="text-xs font-medium text-gray-600 w-20 shrink-0 pt-1">{grade}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {sections.filter(s => s.grade === grade && s.is_active).map(sec => (
                        <span key={sec.id || sec.name}
                          className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium cursor-pointer hover:bg-indigo-200"
                          onClick={() => setSelectedGrade(grade)}
                          title={`${sec.student_count} student(s)`}>
                          {sec.name}
                          {sec.student_count > 0 && <span className="ml-1 text-indigo-400">{sec.student_count}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
