import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:3000";
const ACADEMIC_YEAR = "2025-26";

const GRADES = [
  "Grade 1","Grade 2","Grade 3","Grade 4","Grade 5",
  "Grade 6","Grade 7","Grade 8","Grade 9","Grade 10",
];

export default function TeacherMappingsPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [sections, setSections] = useState<Record<string, string[]>>({});
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [mappings, setMappings] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [allSections, setAllSections] = useState<string[]>([]);

  // New mapping form
  const [newGrade, setNewGrade] = useState("Grade 9");
  const [newSection, setNewSection] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

  useEffect(() => { fetchTeachers(); fetchAllSections(); }, []);

  useEffect(() => {
    if (newGrade) fetchSectionsForGrade(newGrade);
  }, [newGrade]);

  useEffect(() => {
    if (newGrade && newSection) fetchSubjectsForSection(newGrade, newSection);
  }, [newGrade, newSection]);

  const fetchTeachers = async () => {
    try {
      const r = await axios.get(`${API}/mappings/teachers?academic_year=${ACADEMIC_YEAR}`);
      setTeachers(r.data || []);
    } catch { }
  };

  const fetchAllSections = async () => {
    try {
      const r = await axios.get(`${API}/students?limit=2000`);
      const students = r.data?.data || r.data || [];
      const secSet = [...new Set(students.map((s: any) => `${s.current_class}__${s.section}`).filter(Boolean))] as string[];
      setAllSections(secSet);
    } catch { }
  };

  const fetchSectionsForGrade = async (grade: string) => {
    try {
      const r = await axios.get(`${API}/students?limit=2000`);
      const students = r.data?.data || r.data || [];
      const secs = [...new Set(
        students.filter((s: any) => s.current_class === grade).map((s: any) => s.section).filter(Boolean)
      )] as string[];
      setAvailableSections(secs.sort());
      if (secs.length) setNewSection(secs[0]);
    } catch { }
  };

  const fetchSubjectsForSection = async (grade: string, section: string) => {
    try {
      const r = await axios.get(`${API}/pasa/subjects?academic_year=${ACADEMIC_YEAR}&exam_type=PA3&grade=${encodeURIComponent(grade)}`);
      if (r.data?.length) {
        setAvailableSubjects(r.data);
        setNewSubject(r.data[0]);
      } else {
        setAvailableSubjects([]);
        setNewSubject("");
      }
    } catch { }
  };

  const selectTeacher = (teacher: any) => {
    setSelectedTeacher(teacher);
    setMappings(teacher.mappings || []);
    setMessage("");
  };

  const addMapping = () => {
    if (!newSection) { setMessage("❌ Select a section"); return; }
    // Check duplicate
    const exists = mappings.find(m =>
      m.grade === newGrade && m.section === newSection &&
      m.subject === (newSubject || null) && m.is_class_teacher === isClassTeacher
    );
    if (exists) { setMessage("❌ This mapping already exists"); return; }

    setMappings(prev => [...prev, {
      grade: newGrade,
      section: newSection,
      subject: newSubject || null,
      is_class_teacher: isClassTeacher,
      _new: true,
    }]);
    setMessage("");
  };

  const removeMapping = (index: number) => {
    setMappings(prev => prev.filter((_, i) => i !== index));
  };

  const saveMappings = async () => {
    if (!selectedTeacher) return;
    setSaving(true);
    try {
      await axios.post(`${API}/mappings/save`, {
        teacher_id: selectedTeacher.id,
        teacher_name: selectedTeacher.name,
        teacher_email: selectedTeacher.email,
        academic_year: ACADEMIC_YEAR,
        mappings: mappings.map(m => ({
          grade: m.grade,
          section: m.section,
          subject: m.subject,
          is_class_teacher: m.is_class_teacher,
        })),
      });
      setMessage("✅ Mappings saved successfully");
      await fetchTeachers();
      // Refresh selected teacher
      const updated = teachers.find(t => t.id === selectedTeacher.id);
      if (updated) setSelectedTeacher(updated);
    } catch { setMessage("❌ Error saving mappings"); }
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const filteredTeachers = teachers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">Teacher Mappings</h1>
        <p className="text-sm text-gray-500">
          Assign teachers to grades, sections and subjects · Mark class teachers
        </p>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded text-sm border ${message.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Teacher list */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <h2 className="text-sm font-bold text-gray-700 mb-2">Teachers</h2>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search teachers..."
              className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full"
            />
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {filteredTeachers.map(teacher => (
              <button
                key={teacher.id}
                onClick={() => selectTeacher(teacher)}
                className={`w-full text-left px-3 py-3 border-b border-gray-100 hover:bg-indigo-50 transition-all ${selectedTeacher?.id === teacher.id ? "bg-indigo-50 border-l-4 border-l-indigo-500" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{teacher.name}</p>
                    <p className="text-xs text-gray-400">{teacher.email}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${teacher.mappings?.length > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                      {teacher.mappings?.length || 0} mapping{teacher.mappings?.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                {teacher.mappings?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {teacher.mappings.slice(0, 3).map((m: any, i: number) => (
                      <span key={i} className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">
                        {m.grade.replace("Grade ", "G")} {m.section} {m.is_class_teacher ? "👑" : ""} {m.subject ? `· ${m.subject}` : ""}
                      </span>
                    ))}
                    {teacher.mappings.length > 3 && (
                      <span className="text-xs text-gray-400">+{teacher.mappings.length - 3} more</span>
                    )}
                  </div>
                )}
              </button>
            ))}
            {filteredTeachers.length === 0 && (
              <div className="p-4 text-center text-gray-400 text-sm">No teachers found</div>
            )}
          </div>
        </div>

        {/* Mapping editor */}
        <div className="col-span-2">
          {selectedTeacher ? (
            <div className="space-y-4">
              {/* Teacher header */}
              <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-gray-800">{selectedTeacher.name}</h2>
                    <p className="text-xs text-gray-500">{selectedTeacher.email}</p>
                  </div>
                  <button
                    onClick={saveMappings}
                    disabled={saving}
                    className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold"
                  >
                    {saving ? "Saving..." : "💾 Save All Mappings"}
                  </button>
                </div>
              </div>

              {/* Add new mapping */}
              <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Add New Mapping</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Grade</label>
                    <select value={newGrade} onChange={e => setNewGrade(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full">
                      {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Section</label>
                    <select value={newSection} onChange={e => setNewSection(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full">
                      {availableSections.length
                        ? availableSections.map(s => <option key={s} value={s}>{s}</option>)
                        : <option value="">No sections</option>}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Subject</label>
                    {availableSubjects.length ? (
                      <select value={newSubject} onChange={e => setNewSubject(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full">
                        <option value="">-- No subject --</option>
                        {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <input value={newSubject} onChange={e => setNewSubject(e.target.value)}
                        placeholder="e.g. MATHS"
                        className="border border-gray-300 rounded px-2 py-1.5 text-xs w-full" />
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Class Teacher</label>
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                      <input type="checkbox" checked={isClassTeacher}
                        onChange={e => setIsClassTeacher(e.target.checked)}
                        className="w-4 h-4 accent-indigo-600" />
                      <span className="text-xs text-gray-700">👑 Yes</span>
                    </label>
                  </div>
                  <button onClick={addMapping}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 font-medium">
                    + Add
                  </button>
                </div>
              </div>

              {/* Current mappings */}
              <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700">
                    Current Mappings ({mappings.length})
                  </h3>
                </div>
                {mappings.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    No mappings yet — add mappings above
                  </div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                        <th className="px-4 py-2 text-left">Grade</th>
                        <th className="px-4 py-2 text-left">Section</th>
                        <th className="px-4 py-2 text-left">Subject</th>
                        <th className="px-4 py-2 text-center">Class Teacher</th>
                        <th className="px-4 py-2 text-center">Remove</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappings.map((m, i) => (
                        <tr key={i} className={`border-b border-gray-100 ${m._new ? "bg-green-50" : i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                          <td className="px-4 py-2.5 font-medium text-gray-800">{m.grade}</td>
                          <td className="px-4 py-2.5 text-gray-700">{m.section}</td>
                          <td className="px-4 py-2.5">
                            {m.subject ? (
                              <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{m.subject}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {m.is_class_teacher ? (
                              <span className="text-yellow-600 font-bold">👑 Yes</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button onClick={() => removeMapping(i)}
                              className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 font-medium">
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Default password info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-blue-800 mb-1">
                  🔑 Default Password Info
                </h3>
                <p className="text-xs text-blue-600">
                  Teachers login with their email. Default password is set when the teacher account was created.
                  If you need to reset a password, go to the Users page and update it there.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">👈</p>
              <p className="text-sm font-medium">Select a teacher from the list to manage their mappings</p>
              <p className="text-xs mt-1">You can assign grades, sections, subjects and mark class teachers</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}