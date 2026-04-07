import { useState, useEffect } from "react";
import axios from "axios";

const API = "https://cbas-backend-production.up.railway.app";

const GRADES = [
  "Pre-KG","LKG","UKG",
  "Grade 1","Grade 2","Grade 3","Grade 4","Grade 5",
  "Grade 6","Grade 7","Grade 8","Grade 9","Grade 10",
];

export default function SectionManagementPage() {
  const [sectionMap, setSectionMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState("Grade 1");
  const [newSection, setNewSection] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // Local additions (sections added this session not yet in DB via students)
  const [localSections, setLocalSections] = useState<Record<string, string[]>>({});

  useEffect(() => { fetchSections(); }, []);

  const fetchSections = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/students/sections/all`);
      setSectionMap(r.data || {});
    } catch { }
    setLoading(false);
  };

  const getSectionsForGrade = (grade: string) => {
    const fromDB = sectionMap[grade] || [];
    const fromLocal = localSections[grade] || [];
    return [...new Set([...fromDB, ...fromLocal])].sort();
  };

  const addSection = async () => {
    if (!newSection.trim()) { setMsg("❌ Enter a section name"); return; }
    const name = newSection.trim().toUpperCase();
    const existing = getSectionsForGrade(selectedGrade);
    if (existing.includes(name)) { setMsg(`❌ Section ${name} already exists in ${selectedGrade}`); return; }

    setSaving(true);
    try {
      const r = await axios.post(`${API}/students/sections`, {
        grade: selectedGrade,
        section: name,
      });
      if (r.data?.success) {
        setLocalSections(prev => ({
          ...prev,
          [selectedGrade]: [...(prev[selectedGrade] || []), name],
        }));
        setMsg(`✅ Section ${name} added to ${selectedGrade}`);
        setNewSection("");
      } else {
        setMsg(`❌ ${r.data?.message || "Failed"}`);
      }
    } catch { setMsg("❌ Error adding section"); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  const removeSection = async (grade: string, section: string) => {
    if (!confirm(`Remove section ${section} from ${grade}? This only works if no students are in this section.`)) return;
    try {
      const r = await axios.delete(`${API}/students/sections/${encodeURIComponent(grade)}/${encodeURIComponent(section)}`);
      if (r.data?.success) {
        setLocalSections(prev => ({
          ...prev,
          [grade]: (prev[grade] || []).filter(s => s !== section),
        }));
        setSectionMap(prev => ({
          ...prev,
          [grade]: (prev[grade] || []).filter(s => s !== section),
        }));
        setMsg(`✅ Section ${section} removed`);
      } else {
        setMsg(`❌ ${r.data?.message}`);
      }
    } catch { setMsg("❌ Error removing section"); }
    setTimeout(() => setMsg(""), 3000);
  };

  const totalSections = Object.values(sectionMap).reduce((t, s) => t + s.length, 0);

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">🏫 Section Management</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage sections for each grade. Add new sections when needed.</p>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-2 rounded text-sm border ${msg.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>
          {msg}
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
          <p className="text-2xl font-bold text-green-700">{Object.keys(sectionMap).length}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500">
          <p className="text-xs text-gray-500">Total Sections</p>
          <p className="text-2xl font-bold text-blue-700">{totalSections}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-purple-500">
          <p className="text-xs text-gray-500">Selected Grade Sections</p>
          <p className="text-2xl font-bold text-purple-700">{getSectionsForGrade(selectedGrade).length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Left — Grade list */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-700">Grades</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {GRADES.map(grade => (
              <button key={grade} onClick={() => setSelectedGrade(grade)}
                className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-indigo-50 transition-colors ${selectedGrade === grade ? "bg-indigo-50 border-l-4 border-indigo-600" : ""}`}>
                <span className={`text-sm font-medium ${selectedGrade === grade ? "text-indigo-700" : "text-gray-700"}`}>{grade}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getSectionsForGrade(grade).length > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                  {getSectionsForGrade(grade).length} sections
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right — Sections for selected grade */}
        <div className="sm:col-span-2 space-y-4">
          {/* Add section */}
          <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
            <h2 className="text-sm font-bold text-gray-700 mb-3">Add Section to {selectedGrade}</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={newSection}
                onChange={e => setNewSection(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && addSection()}
                placeholder="Section name (e.g. HIMALAYA)"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button onClick={addSection} disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
                {saving ? "Adding..." : "+ Add"}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Section names will be automatically uppercased</p>
          </div>

          {/* Current sections */}
          <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-700">Sections in {selectedGrade}</h2>
              <span className="text-xs text-gray-500">{getSectionsForGrade(selectedGrade).length} sections</span>
            </div>
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : getSectionsForGrade(selectedGrade).length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-2xl mb-2">📭</p>
                <p className="text-sm">No sections defined for {selectedGrade}</p>
                <p className="text-xs mt-1">Add sections using the form above or import students</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {getSectionsForGrade(selectedGrade).map(section => (
                  <div key={section} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <span className="text-sm font-medium text-gray-800">{selectedGrade} — {section}</span>
                    </div>
                    <button onClick={() => removeSection(selectedGrade, section)}
                      className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All grades overview */}
          <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-700">All Grades Overview</h2>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {GRADES.filter(g => getSectionsForGrade(g).length > 0).map(grade => (
                  <div key={grade} className="flex items-start gap-3">
                    <span className="text-xs font-medium text-gray-600 w-20 shrink-0 pt-1">{grade}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {getSectionsForGrade(grade).map(s => (
                        <span key={s} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">{s}</span>
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
