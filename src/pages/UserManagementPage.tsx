import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = "https://cbas-backend-production.up.railway.app";

const ACADEMIC_YEARS = Array.from({ length: 10 }, (_, i) => {
  const y = 2025 + i;
  return `${y}-${String(y + 1).slice(2)}`;
});

const CLASSES = [
  "Pre-KG", "LKG", "UKG",
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
  "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
];

const ALL_SECTIONS = [
  "Duke", "Popeye", "Daisy", "Lotus", "Orchid", "Tulip", "Eagle", "Robin", "Skylark",
  "Asteroid", "Comet", "Galaxy", "Apus", "Pavo", "Volans",
  "Edison", "Einstein", "Kalam", "Raman",
  "Diamond", "Emerald", "Ruby",
  "Ganga", "Godavari", "Kaveri",
  "Sathya", "Shanthi", "Vedha",
  "Jupiter", "Mars", "Mercury", "Venus",
  "Centaurus", "Orion", "Pegasus",
  "Himalaya", "Meru", "Vindhya",
  "Bendre", "Karanth", "Kuvempu",
];

const SUBJECTS = [
  "English", "Mathematics", "Science", "Social Science", "Kannada", "Hindi",
  "Physics", "Chemistry", "Biology", "Mother Teacher", "Music", "Art",
  "Physical Education", "Computer Science", "EVS", "Other",
];

// ── PRE-LOADED TEACHER DATA FROM EXCEL ────────────────────────────────────────
const EXCEL_TEACHERS = [
  { name: "Chandana.K", email: "chandanasindhu12@gmail.com", password: "Chandana589", subject: "English", grade: "Grade 8, Grade 9", section: "Orion, Pegasus, Centaurus, Himalaya", class_teacher: "" },
  { name: "Deepthi.R.Sahana", email: "deepthi.r.sahana0519@gmail.com", password: "Deepthi878", subject: "Mathematics", grade: "Grade 9, Grade 10", section: "Meru, Himalaya, Vindhya, Bendre, Kuvempu, Karanth", class_teacher: "" },
  { name: "Monisha N", email: "monishanswamy261998@gmail.com", password: "Monisha122", subject: "Mathematics", grade: "Grade 8", section: "Centaurus, Orion, Pegasus", class_teacher: "Grade 8 Centaurus" },
  { name: "Bhavani B Karabassi", email: "bhavanimk59@gmail.com", password: "Bhavani451", subject: "English", grade: "Grade 4", section: "Ruby, Diamond, Emerald", class_teacher: "Grade 4 Ruby" },
  { name: "Geetha H S", email: "geethamilan2018@gmail.com", password: "geetha634", subject: "Kannada", grade: "Grade 3, Grade 4", section: "Edison, Einstein, Kalam, Raman, Ruby", class_teacher: "Grade 3 Kalam" },
  { name: "Chandana R", email: "chandanar2392002@gmail.com", password: "chandana694", subject: "Science", grade: "Grade 5, Grade 6", section: "Shanthi, Sathya, Vedha, Godavari", class_teacher: "Grade 6 Shanthi" },
  { name: "Nagashree M S", email: "msnagashree925@gmail.com", password: "Nagashree664", subject: "Kannada", grade: "Grade 9, Grade 10", section: "Vindhya, Himalaya, Meru, Bendre, Kuvempu, Karanth", class_teacher: "Grade 10 Bendre" },
  { name: "Anna George", email: "", password: "Anna309", subject: "English", grade: "Grade 7", section: "Mercury, Mars, Jupiter, Venus", class_teacher: "" },
  { name: "Manjula S", email: "manjulagirish434@gmail.com", password: "Manjula990", subject: "Mother Teacher", grade: "Grade 1", section: "Asteroid", class_teacher: "" },
  { name: "Chandana Rao", email: "raochandana16@gmail.com", password: "Chandana527", subject: "Social", grade: "Grade 7, Grade 8", section: "Mercury, Jupiter, Pegasus, Centaurus", class_teacher: "Grade 7 Mercury" },
  { name: "Trupti Naik", email: "truptinaik1018@gmail.com", password: "Trupti598", subject: "Hindi", grade: "Grade 1, Grade 2", section: "Asteroid, Galaxy, Comet, Apus, Volans, Pavo", class_teacher: "" },
  { name: "Harshitha N M", email: "harshiharshinm@gmail.com", password: "Harshitha981", subject: "Science", grade: "Grade 4, Grade 5", section: "Emerald, Diamond, Ganga, Kaveri", class_teacher: "Grade 4 Emerald" },
  { name: "Akallya VS", email: "vsakallya7@gmail.com", password: "Akallya469", subject: "Science", grade: "Grade 8, Grade 9, Grade 10", section: "Orion, Pegasus, Centaurus, Himalaya, Vindhya, Meru, Bendre, Karanth, Kuvempu", class_teacher: "Grade 9 Himalaya" },
  { name: "Jayashree", email: "jayaprajwal4422@gmail.com", password: "Jayashree250", subject: "Mother Teacher", grade: "LKG", section: "Tulip", class_teacher: "LKG Tulip" },
  { name: "Priyanka K M", email: "priyankapriya0809@gmail.com", password: "Priyanka785", subject: "Mathematics", grade: "Grade 5", section: "Kaveri, Ganga, Godavari", class_teacher: "Grade 5 Kaveri" },
  { name: "Poornima N", email: "poornimasiri12@gmail.com", password: "Poornima763", subject: "Science", grade: "Grade 7", section: "Mercury, Mars, Venus, Jupiter", class_teacher: "Grade 7 Jupiter" },
  { name: "Nithyashree P", email: "nithyabharath23@gmail.com", password: "Nithyashree100", subject: "Mother Teacher", grade: "Grade 2", section: "Pavo", class_teacher: "Grade 2 Pavo" },
  { name: "Ranjitha S Naveen", email: "nvnr14@gmail.com", password: "Ranjitha690", subject: "Science (Biology)", grade: "Grade 9, Grade 10", section: "Meru, Vindhya, Himalaya, Kuvempu, Bendre, Karanth", class_teacher: "Grade 10 Karanth" },
  { name: "Nagendra G P", email: "nagendragp777@gmail.com", password: "Nagendra131", subject: "Mathematics", grade: "Grade 9, Grade 10", section: "Meru, Himalaya, Vindhya, Kuvempu, Bendre, Karanth", class_teacher: "Grade 10 Kuvempu" },
  { name: "Anitha P N", email: "ANITHA.P.NAYAK.14@gmail.com", password: "Anitha659", subject: "Mother Teacher", grade: "Grade 2", section: "Apus", class_teacher: "Grade 2 Apus" },
  { name: "Gracy V", email: "gracegrace58897@gmail.com", password: "Gracy473", subject: "Social Science", grade: "Grade 8, Grade 9", section: "Orion, Meru, Himalaya, Vindhya", class_teacher: "Grade 8 Orion" },
  { name: "Bhavya B M", email: "bhavyamunirajubm@gmail.com", password: "Bhavya839", subject: "English", grade: "Grade 4, Grade 5", section: "Kaveri, Godavari, Ganga, Ruby", class_teacher: "Grade 5 Kaveri" },
  { name: "Jyothilakshmi S", email: "jyothilakshminagendra@gmail.com", password: "Jyothilakshmi772", subject: "Kannada", grade: "Grade 4, Grade 5, Grade 6", section: "Diamond, Emerald, Kaveri, Godavari, Ganga, Vedha", class_teacher: "" },
  { name: "Sunita Koushik", email: "kaushiksunita1988@gmail.com", password: "sunita483", subject: "Hindi", grade: "Grade 5, Grade 6", section: "Ganga, Kaveri, Godavari, Sathya, Vedha, Shanthi", class_teacher: "" },
  { name: "Mamatha A M", email: "mmamatha383@gmail.com", password: "Mamatha623", subject: "Hindi", grade: "Grade 7, Grade 8", section: "Mercury, Venus, Mars, Jupiter, Pegasus, Centaurus, Orion", class_teacher: "" },
  { name: "Lalitha H N", email: "saralavathilalitha@gmail.com", password: "Lalitha406", subject: "Hindi", grade: "Grade 3, Grade 4", section: "Kalam, Edison, Einstein, Raman, Emerald, Ruby, Diamond", class_teacher: "" },
  { name: "Gagana B", email: "gaganab2107@gmail.com", password: "Gagana248", subject: "English", grade: "Grade 6", section: "Sathya, Shanthi, Vedha", class_teacher: "Grade 6 Sathya" },
  { name: "Sahana Y N", email: "sahanasahanayn@gmail.com", password: "sahana427", subject: "Science", grade: "Grade 3", section: "Edison, Einstein, Kalam, Raman", class_teacher: "Grade 3 Einstein" },
  { name: "Vidya G S", email: "vidyashreebabu28@gmail.com", password: "Vidya841", subject: "English", grade: "Grade 3", section: "Edison, Einstein, Kalam, Raman", class_teacher: "Grade 3 Edison" },
  { name: "Jyothi S", email: "jyothisjyo01@gmail.com", password: "Jyothi560", subject: "Social", grade: "Grade 4, Grade 5", section: "Ganga, Godavari, Emerald, Diamond", class_teacher: "Grade 5 Ganga" },
  { name: "Ashwini K N", email: "knashwini248@gmail.com", password: "Ashwini637", subject: "Music", grade: "Grade 1, Grade 2, Grade 3, Grade 4, Grade 5, Grade 6, Grade 7, Grade 8", section: "Asteroid, Galaxy, Comet, Apus, Volans, Pavo, Edison, Einstein, Kalam, Raman, Diamond, Emerald, Ruby, Ganga, Godavari, Kaveri, Sathya, Shanthi, Vedha, Jupiter, Mars, Mercury, Venus, Centaurus, Orion, Pegasus, Himalaya, Meru, Vindhya, Bendre, Karanth, Kuvempu", class_teacher: "" },
  { name: "Lakshmi L", email: "shashilakshmi88@gmail.com", password: "Lakshmi507", subject: "Social Science", grade: "Grade 6, Grade 7", section: "Sathya, Shanthi, Venus, Mars", class_teacher: "Grade 7 Mars" },
  { name: "Hema S", email: "hemasuresh3355@gmail.com", password: "Hema521", subject: "Mother Teacher", grade: "Grade 1", section: "Galaxy", class_teacher: "" },
  { name: "Geetha Chandru H S", email: "geethachandu218@gmail.com", password: "Geetha124", subject: "Mother Teacher", grade: "Grade 1", section: "Comet", class_teacher: "" },
  { name: "Hepsiba", email: "kesiahepsir@gmail.com", password: "hepsiba305", subject: "Mathematics", grade: "Grade 4", section: "Diamond, Emerald, Ruby", class_teacher: "Grade 4 Diamond" },
  { name: "Shruti V Naik", email: "shrutivnaik1302@gmail.com", password: "Shruti777", subject: "Mother Teacher", grade: "Pre-KG", section: "Duke", class_teacher: "Pre-KG Duke" },
  { name: "Chaithra M", email: "chaithrayashu1@gmail.com", password: "Chaithra157", subject: "Mother Teacher", grade: "LKG", section: "Lotus", class_teacher: "LKG Lotus" },
  { name: "Nayana S", email: "nayanasnns@gmail.com", password: "Nayana333", subject: "Mathematics", grade: "Grade 5, Grade 6, Grade 7", section: "Kaveri, Ganga, Godavari, Sathya, Shanthi, Vedha, Mercury, Mars, Venus, Jupiter", class_teacher: "" },
  { name: "Kavya S", email: "kavyaraju383@gmail.com", password: "Kavya950", subject: "Mother Teacher", grade: "LKG", section: "Daisy", class_teacher: "LKG Daisy" },
  { name: "Aliya Tabassum", email: "aliyatabassum27@gmail.com", password: "Aliya145", subject: "Mathematics", grade: "Grade 3", section: "Raman, Edison, Einstein, Kalam", class_teacher: "Grade 3 Raman" },
  { name: "Sulna Gopi", email: "Sulnagopi@gmail.com", password: "Sulna147", subject: "Mother Teacher", grade: "UKG", section: "Skylark", class_teacher: "UKG Skylark" },
  { name: "Renuka", email: "renukaraghu.rrr@gmail.com", password: "Renuka695", subject: "Mother Teacher", grade: "UKG", section: "Robin", class_teacher: "UKG Robin" },
  { name: "Pallavi", email: "pallaviacharm91@gmail.com", password: "Pallavi844", subject: "Mother Teacher", grade: "UKG", section: "Eagle", class_teacher: "UKG Eagle" },
  { name: "Tanusha", email: "tanupeacock@gmail.com", password: "Tanusha510", subject: "Mother Teacher", grade: "Pre-KG", section: "Popeye", class_teacher: "Pre-KG Popeye" },
  { name: "Lilly Paul", email: "lillypaulpolachan@gmail.com", password: "Lilly355", subject: "Mother Teacher", grade: "Grade 2", section: "Volans", class_teacher: "" },
  { name: "Kavya M", email: "kavyamuralidhar18@gmail.com", password: "Kavya947", subject: "English", grade: "Grade 9, Grade 10", section: "Meru, Vindhya, Kuvempu, Karanth, Bendre", class_teacher: "Grade 9 Vindhya" },
  { name: "Umadevi P C", email: "pcumadevi3110@gmail.com", password: "Umadevi323", subject: "Social Science", grade: "Grade 10", section: "Bendre, Kuvempu, Karanth", class_teacher: "" },
  { name: "Sridhar P", email: "sridharpgf@gmail.com", password: "SRIDHAR580", subject: "Biology", grade: "Grade 8, Grade 9, Grade 10", section: "Pegasus, Orion, Centaurus, Himalaya, Meru, Vindhya, Kuvempu, Bendre, Karanth", class_teacher: "Grade 8 Pegasus" },
  { name: "Sahana D S", email: "sahanasmallesh@gmail.com", password: "Sahana464", subject: "Mathematics", grade: "Grade 6, Grade 7", section: "Shanthi, Sathya, Vedha, Jupiter", class_teacher: "Grade 6 Vedha" },
  { name: "Pooja K S", email: "", password: "Pooja123", subject: "English", grade: "Grade 7", section: "Mercury, Venus, Mars", class_teacher: "Grade 7 Venus" },
  { name: "Bi bi Ayesha", email: "", password: "Ayesha123", subject: "English", grade: "Grade 1, Grade 2", section: "Asteroid, Galaxy, Comet, Apus, Volans, Pavo", class_teacher: "" },
  { name: "Swetha G", email: "garkaswetha@gmail.com", password: "garka1234", subject: "IT", grade: "Grade 9, Grade 10", section: "Himalaya, Meru, Vindhya, Bendre, Karanth, Kuvempu", class_teacher: "" },
];

export default function UserManagementPage() {
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<any>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const photoRef = useRef<HTMLInputElement>(null);

  // Form state
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "teacher",
    subjects: [] as string[], assigned_classes: [] as string[],
    assigned_sections: [] as string[], class_teacher_of: "",
    phone: "", qualification: "", experience: "", photo: "",
  });
  const [customSubject, setCustomSubject] = useState("");

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/users`);
      setUsers(r.data || []);
    } catch { }
    setLoading(false);
  };

  const resetForm = () => setForm({
    name: "", email: "", password: "", role: "teacher",
    subjects: [], assigned_classes: [], assigned_sections: [],
    class_teacher_of: "", phone: "", qualification: "", experience: "", photo: "",
  });

  const openAdd = () => { resetForm(); setEditUser(null); setShowForm(true); };

  const openEdit = (user: any) => {
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "teacher",
      subjects: user.subjects || [],
      assigned_classes: user.assigned_classes || [],
      assigned_sections: user.assigned_sections || [],
      class_teacher_of: user.class_teacher_of || "",
      phone: user.phone || "",
      qualification: user.qualification || "",
      experience: user.experience || "",
      photo: user.photo || "",
    });
    setEditUser(user);
    setShowForm(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(p => ({ ...p, photo: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const saveUser = async () => {
    if (!form.name || !form.email) {
      setMessage("❌ Name and Email are required");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    try {
      if (editUser) {
        await axios.patch(`${API}/users/${editUser.id}`, form);
        setMessage("✅ User updated");
      } else {
        if (!form.password) { setMessage("❌ Password required for new users"); setTimeout(() => setMessage(""), 3000); return; }
        await axios.post(`${API}/users`, form);
        setMessage("✅ User created");
      }
      setShowForm(false);
      resetForm();
      fetchUsers();
    } catch (e: any) {
      setMessage("❌ " + (e?.response?.data?.message || "Error saving user"));
    }
    setTimeout(() => setMessage(""), 4000);
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    try {
      await axios.delete(`${API}/users/${id}/permanent`);
      setMessage("✅ Deleted");
      fetchUsers();
    } catch { setMessage("❌ Error"); }
    setTimeout(() => setMessage(""), 3000);
  };

  const toggleSubject = (sub: string) => {
    setForm(p => ({
      ...p,
      subjects: p.subjects.includes(sub) ? p.subjects.filter(s => s !== sub) : [...p.subjects, sub],
    }));
  };

  const toggleClass = (cls: string) => {
    setForm(p => ({
      ...p,
      assigned_classes: p.assigned_classes.includes(cls)
        ? p.assigned_classes.filter(c => c !== cls)
        : [...p.assigned_classes, cls],
    }));
  };

  const toggleSection = (sec: string) => {
    setForm(p => ({
      ...p,
      assigned_sections: p.assigned_sections.includes(sec)
        ? p.assigned_sections.filter(s => s !== sec)
        : [...p.assigned_sections, sec],
    }));
  };

  // ── BULK IMPORT ──────────────────────────────────────────────
  const importAllTeachers = async () => {
    setImporting(true);
    setImportProgress(0);
    let success = 0, skipped = 0, failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < EXCEL_TEACHERS.length; i++) {
      const t = EXCEL_TEACHERS[i];
      setImportProgress(Math.round(((i + 1) / EXCEL_TEACHERS.length) * 100));
      if (!t.email) { skipped++; continue; }
      try {
        await axios.post(`${API}/users`, {
          name: t.name,
          email: t.email,
          password: t.password,
          role: "teacher",
          subjects: t.subject ? t.subject.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
          assigned_classes: t.grade ? t.grade.split(",").map((s: string) => {
            const g = s.trim();
            if (!g) return '';
            const lower = g.toLowerCase();
            if (lower.startsWith('grade ') || lower === 'pre-kg' || lower === 'lkg' || lower === 'ukg') return g;
            if (/^\d+$/.test(g)) return `Grade ${g}`;
            return g;
          }).filter(Boolean) : [],
          assigned_sections: t.section ? t.section.split(",").map((s: string) => {
            // Strip grade prefix like "8-Orion" → "Orion"
            return s.trim().replace(/^\d+[-–]\s*/i, '').trim();
          }).filter(Boolean) : [],
          class_teacher_of: t.class_teacher,
        });
        success++;
      } catch (e: any) {
        const msg = e?.response?.data?.message || "";
        if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("duplicate") || e?.response?.status === 409) {
          skipped++;
        } else {
          failed++;
          errors.push(`${t.name}: ${msg}`);
        }
      }
      await new Promise(r => setTimeout(r, 80));
    }

    setImportResults({ success, skipped, failed, errors });
    setImporting(false);
    fetchUsers();
  };

  const teachers = users.filter(u => u.role === "teacher");
  const admins = users.filter(u => u.role === "admin");
  const filtered = teachers.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    (u.subjects || []).join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-3 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">User Management</h1>
          <p className="text-sm text-gray-500">Manage teachers and admins</p>
        </div>
        <div className="flex gap-3 items-end flex-wrap overflow-x-auto pb-1">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Academic Year</label>
            <select value={academicYear} onChange={e => setAcademicYear(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm">
              {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={() => setShowImport(true)}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium flex items-center gap-2">
            📥 Import from Excel
          </button>
          <button onClick={openAdd}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium">
            + Add Teacher
          </button>
        </div>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-2 rounded text-sm border ${message.startsWith("✅") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>
          {message}
        </div>
      )}

      {/* ── IMPORT PANEL ── */}
      {showImport && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700">📥 Import Teachers from Excel Data</h2>
            <button onClick={() => { setShowImport(false); setImportResults(null); }}
              className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4">
            <p className="text-xs font-semibold text-indigo-800 mb-2">Ready to import {EXCEL_TEACHERS.length} teachers with auto-generated passwords:</p>
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-indigo-700 text-white">
                    <th className="px-2 py-1 text-left">#</th>
                    <th className="px-2 py-1 text-left">Name</th>
                    <th className="px-2 py-1 text-left">Email</th>
                    <th className="px-2 py-1 text-left">Password</th>
                    <th className="px-2 py-1 text-left">Subject</th>
                    <th className="px-2 py-1 text-left">Grades</th>
                    <th className="px-2 py-1 text-left">Sections</th>
                    <th className="px-2 py-1 text-left">Class Teacher Of</th>
                  </tr>
                </thead>
                <tbody>
                  {EXCEL_TEACHERS.map((t, i) => (
                    <tr key={i} className={`border-b border-indigo-100 ${i % 2 === 0 ? "bg-white" : "bg-indigo-50/50"} ${!t.email ? "opacity-50" : ""}`}>
                      <td className="px-2 py-1 text-gray-500">{i + 1}</td>
                      <td className="px-2 py-1 font-medium text-gray-800">{t.name}</td>
                      <td className="px-2 py-1 text-gray-500">{t.email || <span className="text-red-400 italic">no email — will skip</span>}</td>
                      <td className="px-2 py-1">
                        <span className="font-mono bg-gray-100 px-1 rounded text-indigo-700">{t.password}</span>
                      </td>
                      <td className="px-2 py-1 text-gray-600">{t.subject}</td>
                      <td className="px-2 py-1 text-blue-700 text-xs">{t.grade}</td>
                      <td className="px-2 py-1 text-green-700 text-xs">{t.section}</td>
                      <td className="px-2 py-1 text-purple-700 text-xs font-medium">{t.class_teacher || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {importing && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Importing...</span>
                <span>{importProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${importProgress}%` }} />
              </div>
            </div>
          )}

          {importResults && (
            <div className={`mb-3 p-3 rounded-lg border ${importResults.failed > 0 ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}`}>
              <p className="text-sm font-semibold text-gray-700 mb-1">Import Complete</p>
              <div className="flex gap-4 text-xs">
                <span className="text-green-700 font-bold">✅ {importResults.success} created</span>
                <span className="text-yellow-700 font-bold">⏭ {importResults.skipped} skipped (no email or already exists)</span>
                {importResults.failed > 0 && <span className="text-red-700 font-bold">❌ {importResults.failed} failed</span>}
              </div>
              {importResults.errors.length > 0 && (
                <div className="mt-2 text-xs text-red-600">
                  {importResults.errors.map((e: string, i: number) => <p key={i}>{e}</p>)}
                </div>
              )}
            </div>
          )}

          {!importResults && (
            <button onClick={importAllTeachers} disabled={importing}
              className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold">
              {importing ? "Importing..." : `🚀 Import All ${EXCEL_TEACHERS.length} Teachers`}
            </button>
          )}
        </div>
      )}

      {/* ── ADD / EDIT FORM ── */}
      {showForm && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-bold text-gray-700 mb-4">
            {editUser ? `✏️ Edit — ${editUser.name}` : "➕ Add New Teacher"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {/* Photo */}
            <div className="col-span-3 flex items-center gap-4">
              <div className="relative">
                {form.photo ? (
                  <img src={form.photo} alt="photo" className="w-16 h-16 rounded-full object-cover border-2 border-indigo-300" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl border-2 border-indigo-200">
                    👤
                  </div>
                )}
                <button onClick={() => photoRef.current?.click()}
                  className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center hover:bg-indigo-700">
                  📷
                </button>
                <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </div>
              <div className="text-xs text-gray-500">
                <p className="font-medium">Profile Photo</p>
                <p>Click the camera icon to upload</p>
                <p>Recommended: Square image, max 2MB</p>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 block mb-1">Full Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Priya Sharma"
                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Email *</label>
              <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="e.g. priya@school.com"
                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{editUser ? "Change Password (optional)" : "Password *"}</label>
              <input type="text" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="e.g. Priya123"
                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full font-mono" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Role</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full">
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Phone</label>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="e.g. 9876543210"
                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Class Teacher Of</label>
              <input value={form.class_teacher_of} onChange={e => setForm(p => ({ ...p, class_teacher_of: e.target.value }))}
                placeholder="e.g. Grade 5 Kaveri"
                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Qualification</label>
              <input value={form.qualification} onChange={e => setForm(p => ({ ...p, qualification: e.target.value }))}
                placeholder="e.g. B.Ed, M.Sc"
                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Experience (years)</label>
              <input value={form.experience} onChange={e => setForm(p => ({ ...p, experience: e.target.value }))}
                placeholder="e.g. 5"
                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full" />
            </div>
          </div>

          {/* Subjects */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-2 font-semibold">
              Subjects ({form.subjects.length} selected)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {SUBJECTS.map(s => (
                <button key={s} onClick={() => toggleSubject(s)}
                  className={`px-3 py-1 text-xs rounded-full border font-medium transition-all ${form.subjects.includes(s) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={customSubject} onChange={e => setCustomSubject(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && customSubject.trim()) {
                    setForm(p => ({ ...p, subjects: [...p.subjects, customSubject.trim()] }));
                    setCustomSubject("");
                  }
                }}
                placeholder="Add custom subject (press Enter)"
                className="border border-gray-300 rounded px-2 py-1 text-xs flex-1" />
            </div>
            {form.subjects.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.subjects.map(s => (
                  <span key={s} className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
                    {s}
                    <button onClick={() => toggleSubject(s)} className="text-indigo-400 hover:text-red-500">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Assigned Classes */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-2 font-semibold">
              Assigned Classes ({form.assigned_classes.length} selected)
            </label>
            <div className="flex flex-wrap gap-2">
              {CLASSES.map(c => (
                <button key={c} onClick={() => toggleClass(c)}
                  className={`px-3 py-1 text-xs rounded-full border font-medium transition-all ${form.assigned_classes.includes(c) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Assigned Sections */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-2 font-semibold">
              Assigned Sections ({form.assigned_sections.length} selected)
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_SECTIONS.map(s => (
                <button key={s} onClick={() => toggleSection(s)}
                  className={`px-3 py-1 text-xs rounded-full border font-medium transition-all ${form.assigned_sections.includes(s) ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-300 hover:border-purple-400"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <button onClick={saveUser}
              className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-semibold">
              💾 {editUser ? "Update Teacher" : "Save Teacher"}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }}
              className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── TEACHERS TABLE ── */}
      <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden mb-4">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-bold text-gray-700">Teachers ({filtered.length})</h2>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or subject..."
            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-64" />
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No teachers found. Use Import from Excel or Add Teacher above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <th className="px-3 py-2 text-center w-8">#</th>
                  <th className="px-3 py-2 text-left min-w-[160px]">Name</th>
                  <th className="px-3 py-2 text-left min-w-[200px]">Email</th>
                  <th className="px-3 py-2 text-left min-w-[160px]">Subjects</th>
                  <th className="px-3 py-2 text-left min-w-[160px]">Classes</th>
                  <th className="px-3 py-2 text-left min-w-[160px]">Sections</th>
                  <th className="px-3 py-2 text-left min-w-[120px]">Class Teacher</th>
                  <th className="px-3 py-2 text-center w-16">Password</th>
                  <th className="px-3 py-2 text-center w-16">Status</th>
                  <th className="px-3 py-2 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id} className={`border-b border-gray-100 hover:bg-indigo-50/30 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                    <td className="px-3 py-2.5 text-center text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {u.photo ? (
                          <img src={u.photo} alt="" className="w-7 h-7 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs flex-shrink-0 text-indigo-600 font-bold">
                            {u.name?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-800">{u.name}</p>
                          {u.qualification && <p className="text-gray-400 text-xs">{u.qualification}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">{u.email || "—"}</td>
                    <td className="px-3 py-2.5">
                      {(u.subjects || []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(u.subjects || []).map((s: string) => (
                            <span key={s} className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-xs font-medium">{s}</span>
                          ))}
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">
                      {(u.assigned_classes || []).length > 0 ? (u.assigned_classes || []).join(", ") : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">
                      {(u.assigned_sections || []).length > 0
                        ? (u.assigned_sections || []).slice(0, 3).join(", ") + ((u.assigned_sections || []).length > 3 ? ` +${(u.assigned_sections || []).length - 3}` : "")
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">
                      {u.class_teacher_of ? (
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-medium">👑 {u.class_teacher_of}</span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => setShowPassword(p => ({ ...p, [u.id]: !p[u.id] }))}
                        className="text-gray-400 hover:text-indigo-600 text-xs">
                        {showPassword[u.id] ? "🔓" : "🔒"}
                      </button>
                      {showPassword[u.id] && (
                        <span className="block font-mono text-xs text-indigo-600 mt-0.5">{u.password || "—"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">Active</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => openEdit(u)}
                          className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-xs font-medium">✏️</button>
                        <button onClick={() => deleteUser(u.id)}
                          className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs font-medium">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── ADMINS TABLE ── */}
      {admins.length > 0 && (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-700">Admins ({admins.length})</h2>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <th className="px-3 py-2 text-center w-8">#</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((u, i) => (
                <tr key={u.id} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                  <td className="px-3 py-2.5 text-center text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-800">{u.name}</td>
                  <td className="px-3 py-2.5 text-gray-500">{u.email}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">Admin</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => openEdit(u)} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-xs">✏️</button>
                      <button onClick={() => deleteUser(u.id)} className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
