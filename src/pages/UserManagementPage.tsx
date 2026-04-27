import { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

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

const QUALIFICATIONS = [
  "NTT", "NST", "DED", "BED",
  "Graduation with BED", "Post Graduation with BED", "Post Graduation",
];

const STAGE_DEFS = [
  { label: "Foundation", grades: ["Pre-KG","LKG","UKG","Grade 1","Grade 2"], color: "bg-green-100 text-green-800" },
  { label: "Preparatory", grades: ["Grade 3","Grade 4","Grade 5"], color: "bg-blue-100 text-blue-800" },
  { label: "Middle", grades: ["Grade 6","Grade 7","Grade 8"], color: "bg-purple-100 text-purple-800" },
  { label: "Secondary", grades: ["Grade 9","Grade 10"], color: "bg-orange-100 text-orange-800" },
];

function getStages(assigned_classes: string[]): { label: string; color: string }[] {
  if (!assigned_classes || assigned_classes.length === 0) return [];
  const found = new Set<string>();
  assigned_classes.forEach(cls => {
    const def = STAGE_DEFS.find(d => d.grades.includes(cls));
    if (def) found.add(def.label);
  });
  return STAGE_DEFS.filter(d => found.has(d.label));
}

function normaliseKey(k: string) { return k.toLowerCase().replace(/[^a-z0-9]/g, ""); }
function pick(row: any, ...candidates: string[]) {
  for (const c of candidates) {
    const hit = Object.keys(row).find(k => normaliseKey(k) === normaliseKey(c));
    if (hit && row[hit] !== undefined && row[hit] !== null && String(row[hit]).trim() !== "") return String(row[hit]).trim();
  }
  return "";
}
function parseGrade(raw: string): string[] {
  return raw.split(/[,;]/).map(g => {
    g = g.trim();
    if (!g) return "";
    if (/^(pre-?kg|lkg|ukg)$/i.test(g)) return g.toUpperCase().replace("PREKG","Pre-KG").replace("PRE-KG","Pre-KG");
    if (/^\d+$/.test(g)) return `Grade ${g}`;
    if (/^grade\s+\d+$/i.test(g)) return g.replace(/^grade\s+/i,"Grade ");
    return g;
  }).filter(Boolean);
}
function autoPassword(name: string): string {
  const first = name.split(/[\s.]/)[0];
  return first + Math.floor(100 + Math.random() * 900);
}
function formatDate(d: string | null | undefined) {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const EXCEL_TEACHERS: any[] = [
  { name: "Chandana.K", email: "chandanasindhu12@gmail.com", password: "Chandana589", subject: "English", grade: "Grade 8, Grade 9", section: "Orion, Pegasus, Centaurus, Himalaya", class_teacher: "", appraisal_qualification: "Post Graduation with BED" },
  { name: "Deepthi.R.Sahana", email: "deepthi.r.sahana0519@gmail.com", password: "Deepthi878", subject: "Mathematics", grade: "Grade 9, Grade 10", section: "Meru, Himalaya, Vindhya, Bendre, Kuvempu, Karanth", class_teacher: "", appraisal_qualification: "Post Graduation with BED" },
  { name: "Monisha N", email: "monishanswamy261998@gmail.com", password: "Monisha122", subject: "Mathematics", grade: "Grade 8", section: "Centaurus, Orion, Pegasus", class_teacher: "Grade 8 Centaurus", appraisal_qualification: "Graduation with BED" },
  { name: "Bhavani B Karabassi", email: "bhavanimk59@gmail.com", password: "Bhavani451", subject: "English", grade: "Grade 4", section: "Ruby, Diamond, Emerald", class_teacher: "Grade 4 Ruby", appraisal_qualification: "Graduation with BED" },
  { name: "Geetha H S", email: "geethamilan2018@gmail.com", password: "geetha634", subject: "Kannada", grade: "Grade 3, Grade 4", section: "Edison, Einstein, Kalam, Raman, Ruby", class_teacher: "Grade 3 Kalam", appraisal_qualification: "Graduation with BED" },
  { name: "Chandana R", email: "chandanar2392002@gmail.com", password: "chandana694", subject: "Science", grade: "Grade 5, Grade 6", section: "Shanthi, Sathya, Vedha, Godavari", class_teacher: "Grade 6 Shanthi", appraisal_qualification: "Graduation with BED" },
  { name: "Nagashree M S", email: "msnagashree925@gmail.com", password: "Nagashree664", subject: "Kannada", grade: "Grade 9, Grade 10", section: "Vindhya, Himalaya, Meru, Bendre, Kuvempu, Karanth", class_teacher: "Grade 10 Bendre", appraisal_qualification: "Post Graduation with BED" },
  { name: "Anna George", email: "", password: "Anna309", subject: "English", grade: "Grade 7", section: "Mercury, Mars, Jupiter, Venus", class_teacher: "", appraisal_qualification: "Graduation with BED" },
  { name: "Manjula S", email: "manjulagirish434@gmail.com", password: "Manjula990", subject: "Mother Teacher", grade: "Grade 1", section: "Asteroid", class_teacher: "", appraisal_qualification: "NTT" },
  { name: "Chandana Rao", email: "raochandana16@gmail.com", password: "Chandana527", subject: "Social", grade: "Grade 7, Grade 8", section: "Mercury, Jupiter, Pegasus, Centaurus", class_teacher: "Grade 7 Mercury", appraisal_qualification: "Post Graduation with BED" },
  { name: "Trupti Naik", email: "truptinaik1018@gmail.com", password: "Trupti598", subject: "Hindi", grade: "Grade 1, Grade 2", section: "Asteroid, Galaxy, Comet, Apus, Volans, Pavo", class_teacher: "", appraisal_qualification: "Graduation with BED" },
  { name: "Harshitha N M", email: "harshiharshinm@gmail.com", password: "Harshitha981", subject: "Science", grade: "Grade 4, Grade 5", section: "Emerald, Diamond, Ganga, Kaveri", class_teacher: "Grade 4 Emerald", appraisal_qualification: "Graduation with BED" },
  { name: "Akallya VS", email: "vsakallya7@gmail.com", password: "Akallya469", subject: "Science", grade: "Grade 8, Grade 9, Grade 10", section: "Orion, Pegasus, Centaurus, Himalaya, Vindhya, Meru, Bendre, Karanth, Kuvempu", class_teacher: "Grade 9 Himalaya", appraisal_qualification: "Post Graduation with BED" },
  { name: "Jayashree", email: "jayaprajwal4422@gmail.com", password: "Jayashree250", subject: "Mother Teacher", grade: "LKG", section: "Tulip", class_teacher: "LKG Tulip", appraisal_qualification: "NTT" },
  { name: "Priyanka K M", email: "priyankapriya0809@gmail.com", password: "Priyanka785", subject: "Mathematics", grade: "Grade 5", section: "Kaveri, Ganga, Godavari", class_teacher: "Grade 5 Kaveri", appraisal_qualification: "Graduation with BED" },
  { name: "Poornima N", email: "poornimasiri12@gmail.com", password: "Poornima763", subject: "Science", grade: "Grade 7", section: "Mercury, Mars, Venus, Jupiter", class_teacher: "Grade 7 Jupiter", appraisal_qualification: "Graduation with BED" },
  { name: "Nithyashree P", email: "nithyabharath23@gmail.com", password: "Nithyashree100", subject: "Mother Teacher", grade: "Grade 2", section: "Pavo", class_teacher: "Grade 2 Pavo", appraisal_qualification: "NTT" },
  { name: "Ranjitha S Naveen", email: "nvnr14@gmail.com", password: "Ranjitha690", subject: "Science (Biology)", grade: "Grade 9, Grade 10", section: "Meru, Vindhya, Himalaya, Kuvempu, Bendre, Karanth", class_teacher: "Grade 10 Karanth", appraisal_qualification: "Post Graduation with BED" },
  { name: "Nagendra G P", email: "nagendragp777@gmail.com", password: "Nagendra131", subject: "Mathematics", grade: "Grade 9, Grade 10", section: "Meru, Himalaya, Vindhya, Kuvempu, Bendre, Karanth", class_teacher: "Grade 10 Kuvempu", appraisal_qualification: "Post Graduation with BED" },
  { name: "Anitha P N", email: "ANITHA.P.NAYAK.14@gmail.com", password: "Anitha659", subject: "Mother Teacher", grade: "Grade 2", section: "Apus", class_teacher: "Grade 2 Apus", appraisal_qualification: "NTT" },
  { name: "Gracy V", email: "gracegrace58897@gmail.com", password: "Gracy473", subject: "Social Science", grade: "Grade 8, Grade 9", section: "Orion, Meru, Himalaya, Vindhya", class_teacher: "Grade 8 Orion", appraisal_qualification: "Post Graduation with BED" },
  { name: "Bhavya B M", email: "bhavyamunirajubm@gmail.com", password: "Bhavya839", subject: "English", grade: "Grade 4, Grade 5", section: "Kaveri, Godavari, Ganga, Ruby", class_teacher: "Grade 5 Kaveri", appraisal_qualification: "Graduation with BED" },
  { name: "Jyothilakshmi S", email: "jyothilakshminagendra@gmail.com", password: "Jyothilakshmi772", subject: "Kannada", grade: "Grade 4, Grade 5, Grade 6", section: "Diamond, Emerald, Kaveri, Godavari, Ganga, Vedha", class_teacher: "", appraisal_qualification: "Graduation with BED" },
  { name: "Sunita Koushik", email: "kaushiksunita1988@gmail.com", password: "sunita483", subject: "Hindi", grade: "Grade 5, Grade 6", section: "Ganga, Kaveri, Godavari, Sathya, Vedha, Shanthi", class_teacher: "", appraisal_qualification: "Graduation with BED" },
  { name: "Mamatha A M", email: "mmamatha383@gmail.com", password: "Mamatha623", subject: "Hindi", grade: "Grade 7, Grade 8", section: "Mercury, Venus, Mars, Jupiter, Pegasus, Centaurus, Orion", class_teacher: "", appraisal_qualification: "Graduation with BED" },
  { name: "Lalitha H N", email: "saralavathilalitha@gmail.com", password: "Lalitha406", subject: "Hindi", grade: "Grade 3, Grade 4", section: "Kalam, Edison, Einstein, Raman, Emerald, Ruby, Diamond", class_teacher: "", appraisal_qualification: "Graduation with BED" },
  { name: "Gagana B", email: "gaganab2107@gmail.com", password: "Gagana248", subject: "English", grade: "Grade 6", section: "Sathya, Shanthi, Vedha", class_teacher: "Grade 6 Sathya", appraisal_qualification: "Graduation with BED" },
  { name: "Sahana Y N", email: "sahanasahanayn@gmail.com", password: "sahana427", subject: "Science", grade: "Grade 3", section: "Edison, Einstein, Kalam, Raman", class_teacher: "Grade 3 Einstein", appraisal_qualification: "Graduation with BED" },
  { name: "Vidya G S", email: "vidyashreebabu28@gmail.com", password: "Vidya841", subject: "English", grade: "Grade 3", section: "Edison, Einstein, Kalam, Raman", class_teacher: "Grade 3 Edison", appraisal_qualification: "Graduation with BED" },
  { name: "Jyothi S", email: "jyothisjyo01@gmail.com", password: "Jyothi560", subject: "Social", grade: "Grade 4, Grade 5", section: "Ganga, Godavari, Emerald, Diamond", class_teacher: "Grade 5 Ganga", appraisal_qualification: "Graduation with BED" },
  { name: "Ashwini K N", email: "knashwini248@gmail.com", password: "Ashwini637", subject: "Music", grade: "Grade 1, Grade 2, Grade 3, Grade 4, Grade 5, Grade 6, Grade 7, Grade 8", section: "All sections", class_teacher: "", appraisal_qualification: "Graduation with BED" },
  { name: "Lakshmi L", email: "shashilakshmi88@gmail.com", password: "Lakshmi507", subject: "Social Science", grade: "Grade 6, Grade 7", section: "Sathya, Shanthi, Venus, Mars", class_teacher: "Grade 7 Mars", appraisal_qualification: "Post Graduation with BED" },
  { name: "Hema S", email: "hemasuresh3355@gmail.com", password: "Hema521", subject: "Mother Teacher", grade: "Grade 1", section: "Galaxy", class_teacher: "", appraisal_qualification: "NTT" },
  { name: "Geetha Chandru H S", email: "geethachandu218@gmail.com", password: "Geetha124", subject: "Mother Teacher", grade: "Grade 1", section: "Comet", class_teacher: "", appraisal_qualification: "NTT" },
  { name: "Hepsiba", email: "kesiahepsir@gmail.com", password: "hepsiba305", subject: "Mathematics", grade: "Grade 4", section: "Diamond, Emerald, Ruby", class_teacher: "Grade 4 Diamond", appraisal_qualification: "Graduation with BED" },
  { name: "Shruti V Naik", email: "shrutivnaik1302@gmail.com", password: "Shruti777", subject: "Mother Teacher", grade: "Pre-KG", section: "Duke", class_teacher: "Pre-KG Duke", appraisal_qualification: "NTT" },
  { name: "Chaithra M", email: "chaithrayashu1@gmail.com", password: "Chaithra157", subject: "Mother Teacher", grade: "LKG", section: "Lotus", class_teacher: "LKG Lotus", appraisal_qualification: "NTT" },
  { name: "Nayana S", email: "nayanasnns@gmail.com", password: "Nayana333", subject: "Mathematics", grade: "Grade 5, Grade 6, Grade 7", section: "Kaveri, Ganga, Godavari, Sathya, Shanthi, Vedha, Mercury, Mars, Venus, Jupiter", class_teacher: "", appraisal_qualification: "Graduation with BED" },
  { name: "Kavya S", email: "kavyaraju383@gmail.com", password: "Kavya950", subject: "Mother Teacher", grade: "LKG", section: "Daisy", class_teacher: "LKG Daisy", appraisal_qualification: "NTT" },
  { name: "Aliya Tabassum", email: "aliyatabassum27@gmail.com", password: "Aliya145", subject: "Mathematics", grade: "Grade 3", section: "Raman, Edison, Einstein, Kalam", class_teacher: "Grade 3 Raman", appraisal_qualification: "Graduation with BED" },
  { name: "Sulna Gopi", email: "Sulnagopi@gmail.com", password: "Sulna147", subject: "Mother Teacher", grade: "UKG", section: "Skylark", class_teacher: "UKG Skylark", appraisal_qualification: "NTT" },
  { name: "Renuka", email: "renukaraghu.rrr@gmail.com", password: "Renuka695", subject: "Mother Teacher", grade: "UKG", section: "Robin", class_teacher: "UKG Robin", appraisal_qualification: "NTT" },
  { name: "Pallavi", email: "pallaviacharm91@gmail.com", password: "Pallavi844", subject: "Mother Teacher", grade: "UKG", section: "Eagle", class_teacher: "UKG Eagle", appraisal_qualification: "NTT" },
  { name: "Tanusha", email: "tanupeacock@gmail.com", password: "Tanusha510", subject: "Mother Teacher", grade: "Pre-KG", section: "Popeye", class_teacher: "Pre-KG Popeye", appraisal_qualification: "NTT" },
  { name: "Lilly Paul", email: "lillypaulpolachan@gmail.com", password: "Lilly355", subject: "Mother Teacher", grade: "Grade 2", section: "Volans", class_teacher: "", appraisal_qualification: "NTT" },
  { name: "Kavya M", email: "kavyamuralidhar18@gmail.com", password: "Kavya947", subject: "English", grade: "Grade 9, Grade 10", section: "Meru, Vindhya, Kuvempu, Karanth, Bendre", class_teacher: "Grade 9 Vindhya", appraisal_qualification: "Post Graduation with BED" },
  { name: "Umadevi P C", email: "pcumadevi3110@gmail.com", password: "Umadevi323", subject: "Social Science", grade: "Grade 10", section: "Bendre, Kuvempu, Karanth", class_teacher: "", appraisal_qualification: "Post Graduation with BED" },
  { name: "Sridhar P", email: "sridharpgf@gmail.com", password: "SRIDHAR580", subject: "Biology", grade: "Grade 8, Grade 9, Grade 10", section: "Pegasus, Orion, Centaurus, Himalaya, Meru, Vindhya, Kuvempu, Bendre, Karanth", class_teacher: "Grade 8 Pegasus", appraisal_qualification: "Post Graduation with BED" },
  { name: "Sahana D S", email: "sahanasmallesh@gmail.com", password: "Sahana464", subject: "Mathematics", grade: "Grade 6, Grade 7", section: "Shanthi, Sathya, Vedha, Jupiter", class_teacher: "Grade 6 Vedha", appraisal_qualification: "Graduation with BED" },
  { name: "Swetha G", email: "garkaswetha@gmail.com", password: "garka1234", subject: "IT", grade: "Grade 9, Grade 10", section: "Himalaya, Meru, Vindhya, Bendre, Karanth, Kuvempu", class_teacher: "", appraisal_qualification: "Post Graduation" },
];

const STAGE_ORDER_LIST = ["Foundation", "Preparatory", "Middle", "Secondary"];
function primaryStageOrder(assigned_classes: string[]): number {
  if (!assigned_classes?.length) return 99;
  let min = 99;
  assigned_classes.forEach(cls => {
    const def = STAGE_DEFS.find(d => d.grades.includes(cls));
    if (def) { const i = STAGE_ORDER_LIST.indexOf(def.label); if (i < min) min = i; }
  });
  return min;
}

export default function UserManagementPage() {
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [users, setUsers] = useState<any[]>([]);
  const [inactiveUsers, setInactiveUsers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, any>>({});
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterQualification, setFilterQualification] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<any>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [parsedTeachers, setParsedTeachers] = useState<any[]>([]);
  const [resetPwdUser, setResetPwdUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [historyUser, setHistoryUser] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const photoRef = useRef<HTMLInputElement>(null);
  const xlsxRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "teacher",
    subjects: [] as string[], assigned_classes: [] as string[],
    assigned_sections: [] as string[], class_teacher_of: "",
    phone: "", appraisal_qualification: "", experience: "", photo: "",
  });
  const [customSubject, setCustomSubject] = useState("");

  useEffect(() => {
    fetchUsers();
    fetchStats();
    fetchInactive();
    fetchAssignments();
  }, [academicYear]);

  const showMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(""), 4000); };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/users`);
      setUsers(r.data || []);
    } catch { }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const r = await axios.get(`${API}/users/stats`);
      setStats(r.data);
    } catch { }
  };

  const fetchInactive = async () => {
    try {
      const r = await axios.get(`${API}/users/inactive`);
      setInactiveUsers(r.data || []);
    } catch { }
  };

  const fetchAssignments = async () => {
    try {
      const r = await axios.get(`${API}/teacher-assignments?academic_year=${academicYear}`);
      const map: Record<string, any> = {};
      (r.data || []).forEach((a: any) => { map[a.teacher_id] = a; });
      setAssignments(map);
    } catch { }
  };

  const resetForm = () => setForm({
    name: "", email: "", password: "", role: "teacher",
    subjects: [], assigned_classes: [], assigned_sections: [],
    class_teacher_of: "", phone: "", appraisal_qualification: "", experience: "", photo: "",
  });

  const openAdd = () => { resetForm(); setEditUser(null); setShowForm(true); };

  const openEdit = (user: any) => {
    const assignment = assignments[user.id];
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "teacher",
      subjects: assignment?.subjects || user.subjects || [],
      assigned_classes: assignment?.assigned_classes || user.assigned_classes || [],
      assigned_sections: user.assigned_sections || [],
      class_teacher_of: user.class_teacher_of || "",
      phone: user.phone || "",
      appraisal_qualification: user.appraisal_qualification || user.qualification || "",
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
    reader.onload = ev => setForm(p => ({ ...p, photo: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const saveUser = async () => {
    if (!form.name || !form.email) { showMsg("❌ Name and Email are required"); return; }
    try {
      let userId = editUser?.id;
      if (editUser) {
        await axios.patch(`${API}/users/${editUser.id}`, form);
        showMsg("✅ User updated");
      } else {
        if (!form.password) { showMsg("❌ Password required for new users"); return; }
        const res = await axios.post(`${API}/users`, form);
        userId = res.data.id;
        showMsg("✅ User created");
      }
      // Save assignment for the selected academic year
      if (userId && (form.subjects.length > 0 || form.assigned_classes.length > 0)) {
        await axios.post(`${API}/teacher-assignments`, {
          teacher_id: userId,
          academic_year: academicYear,
          subjects: form.subjects,
          assigned_classes: form.assigned_classes,
        });
      }
      setShowForm(false);
      resetForm();
      fetchUsers();
      fetchAssignments();
    } catch (e: any) {
      showMsg("❌ " + (e?.response?.data?.message || "Error saving user"));
    }
  };

  const deactivateUser = async (id: string, name: string) => {
    if (!confirm(`Deactivate ${name}? They will lose login access but all data is kept.`)) return;
    try {
      await axios.patch(`${API}/users/${id}/deactivate`);
      showMsg(`✅ ${name} deactivated`);
      fetchUsers(); fetchInactive(); fetchStats();
    } catch { showMsg("❌ Error deactivating user"); }
  };

  const reactivateUser = async (id: string, name: string) => {
    try {
      await axios.patch(`${API}/users/${id}/reactivate`);
      showMsg(`✅ ${name} reactivated`);
      fetchUsers(); fetchInactive(); fetchStats();
    } catch { showMsg("❌ Error reactivating user"); }
  };

  const permanentDelete = async (id: string, name: string) => {
    if (!confirm(`Permanently delete ${name}? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/users/${id}/permanent`);
      showMsg(`✅ ${name} permanently deleted`);
      fetchInactive(); fetchStats();
    } catch { showMsg("❌ Error deleting user"); }
  };

  const doResetPassword = async () => {
    if (!newPassword.trim()) { showMsg("❌ Enter a new password"); return; }
    try {
      await axios.patch(`${API}/users/${resetPwdUser.id}/reset-password`, { password: newPassword });
      showMsg(`✅ Password reset for ${resetPwdUser.name}`);
      setResetPwdUser(null); setNewPassword("");
      fetchUsers();
    } catch { showMsg("❌ Error resetting password"); }
  };

  const copyCredentials = async (u: any) => {
    const text = `Name: ${u.name}\nEmail: ${u.email}\nPassword: ${u.password || "(check admin)"}`;
    navigator.clipboard.writeText(text).then(async () => {
      showMsg(`📋 Credentials copied for ${u.name}`);
      await axios.patch(`${API}/users/${u.id}/mark-shared`);
      fetchUsers();
    }).catch(() => showMsg("❌ Clipboard not available"));
  };

  const viewHistory = async (u: any) => {
    setHistoryUser(u);
    try {
      const r = await axios.get(`${API}/teacher-assignments/history/${u.id}`);
      setHistoryData(r.data || []);
    } catch { setHistoryData([]); }
  };

  const toggleSubject = (sub: string) => setForm(p => ({
    ...p, subjects: p.subjects.includes(sub) ? p.subjects.filter(s => s !== sub) : [...p.subjects, sub],
  }));
  const toggleClass = (cls: string) => setForm(p => ({
    ...p, assigned_classes: p.assigned_classes.includes(cls)
      ? p.assigned_classes.filter(c => c !== cls) : [...p.assigned_classes, cls],
  }));
  const toggleSection = (sec: string) => setForm(p => ({
    ...p, assigned_sections: p.assigned_sections.includes(sec)
      ? p.assigned_sections.filter(s => s !== sec) : [...p.assigned_sections, sec],
  }));

  const handleExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const wb = XLSX.read(ev.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const parsed = rows.map(row => ({
        name: pick(row, "Name", "Teacher Name", "name"),
        email: pick(row, "Email ID", "Email", "email"),
        subject: pick(row, "Subject handling", "Subject", "Subjects"),
        grade: pick(row, "Grade", "Grades", "Class"),
        section: pick(row, "Section", "Sections"),
        class_teacher: pick(row, "Class teacher for grade", "Class Teacher", "class teacher"),
        appraisal_qualification: pick(row, "Appraisal qualification", "Appraisal Qualification", "Qualification"),
        password: autoPassword(pick(row, "Name", "Teacher Name", "name")),
      })).filter(t => t.name);
      setParsedTeachers(parsed);
      setImportResults(null);
    };
    reader.readAsBinaryString(file);
  };

  const importAllTeachers = async () => {
    const list = parsedTeachers.length > 0 ? parsedTeachers : EXCEL_TEACHERS;
    setImporting(true); setImportProgress(0);
    let success = 0, updated = 0, skipped = 0, failed = 0;
    const errors: { row: number; name: string; reason: string }[] = [];
    const emailToUser: Record<string, any> = {};
    users.forEach(u => { if (u.email) emailToUser[u.email.toLowerCase()] = u; });

    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      setImportProgress(Math.round(((i + 1) / list.length) * 100));
      if (!t.email) { skipped++; continue; }
      const grades = parseGrade(t.grade || "");
      const sections = (t.section || "").split(/[,;]/).map((s: string) => s.trim().replace(/^\d+[-–]\s*/i, "").trim()).filter(Boolean);
      const subjects = (t.subject || "").split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
      const payload = {
        name: t.name, email: t.email,
        password: t.password || autoPassword(t.name),
        role: "teacher", subjects, assigned_classes: grades, assigned_sections: sections,
        class_teacher_of: t.class_teacher || "",
        appraisal_qualification: t.appraisal_qualification || "",
      };
      try {
        const res = await axios.post(`${API}/users`, payload);
        // Also create assignment for current academic year
        if (res.data?.id && (subjects.length > 0 || grades.length > 0)) {
          await axios.post(`${API}/teacher-assignments`, {
            teacher_id: res.data.id, academic_year: academicYear,
            subjects, assigned_classes: grades,
          });
        }
        success++;
      } catch (e: any) {
        const msg = e?.response?.data?.message || "";
        if (msg.toLowerCase().includes("already") || e?.response?.status === 409) {
          const existing = emailToUser[t.email.toLowerCase()];
          if (existing) {
            try {
              await axios.patch(`${API}/users/${existing.id}`, { appraisal_qualification: t.appraisal_qualification });
              updated++;
            } catch { skipped++; }
          } else { skipped++; }
        } else {
          failed++;
          errors.push({ row: i + 1, name: t.name, reason: msg || "Unknown error" });
        }
      }
      await new Promise(r => setTimeout(r, 80));
    }
    setImportResults({ success, updated, skipped, failed, errors });
    setImporting(false);
    fetchUsers(); fetchAssignments(); fetchStats();
  };

  const teachers = users.filter(u => u.role === "teacher");
  const admins = users.filter(u => u.role === "admin");

  const filtered = teachers.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      (u.subjects || []).join(" ").toLowerCase().includes(q);
    const assignment = assignments[u.id];
    const effectiveSubjects = assignment?.subjects || u.subjects || [];
    const effectiveClasses = assignment?.assigned_classes || u.assigned_classes || [];
    const matchSubject = !filterSubject || effectiveSubjects.some((s: string) => s.toLowerCase().includes(filterSubject.toLowerCase()));
    const matchGrade = !filterGrade || effectiveClasses.includes(filterGrade);
    const matchQual = !filterQualification || u.appraisal_qualification === filterQualification;
    return matchSearch && matchSubject && matchGrade && matchQual;
  }).sort((a, b) => {
    const aClasses = (assignments[a.id]?.assigned_classes || a.assigned_classes || []);
    const bClasses = (assignments[b.id]?.assigned_classes || b.assigned_classes || []);
    return primaryStageOrder(aClasses) - primaryStageOrder(bClasses);
  });

  return (
    <div className="p-3 sm:p-6">
      {/* ── HEADER ── */}
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
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium">
            📥 Import Excel
          </button>
          <button onClick={openAdd}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium">
            + Add Teacher
          </button>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      {stats && (
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-indigo-700">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-0.5">Active Teachers</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-red-500">{stats.inactive}</p>
              <p className="text-xs text-gray-500 mt-0.5">Deactivated</p>
            </div>
          </div>
          {(stats.byQualification || []).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(stats.byQualification || []).map((q: any) => (
                <div key={q.qualification} className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
                  <p className="text-2xl font-bold text-green-700">{q.count}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{q.qualification}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {message && (
        <div className={`mb-4 px-4 py-2 rounded text-sm border ${message.startsWith("✅") || message.startsWith("📋") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>
          {message}
        </div>
      )}

      {/* ── IMPORT PANEL ── */}
      {showImport && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700">📥 Import Teachers from Excel</h2>
            <button onClick={() => { setShowImport(false); setImportResults(null); setParsedTeachers([]); if(xlsxRef.current) xlsxRef.current.value=""; }}
              className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
          </div>
          <div className="mb-4 p-4 border-2 border-dashed border-indigo-300 rounded-lg bg-indigo-50 flex flex-col items-center gap-2">
            <p className="text-xs text-indigo-700 font-medium">Upload Excel (.xlsx / .xls)</p>
            <p className="text-xs text-gray-500">Columns: Name, Email ID, Appraisal qualification, Subject handling, Grade, Section, Class teacher for grade</p>
            <input ref={xlsxRef} type="file" accept=".xlsx,.xls" onChange={handleExcelFile}
              className="text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:bg-indigo-600 file:text-white file:text-xs file:cursor-pointer" />
          </div>
          {parsedTeachers.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-indigo-800 mb-2">
                {parsedTeachers.length} teachers parsed — {parsedTeachers.filter(t=>!t.email).length} will be skipped (no email)
              </p>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-indigo-700 text-white">
                      {["#","Name","Email","Qualification","Subject","Grade","Section","Class Teacher"].map(h => (
                        <th key={h} className="px-2 py-1 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedTeachers.map((t, i) => (
                      <tr key={i} className={`border-b border-indigo-100 ${i%2===0?"bg-white":"bg-indigo-50/50"} ${!t.email?"opacity-40":""}`}>
                        <td className="px-2 py-1 text-gray-400">{i+1}</td>
                        <td className="px-2 py-1 font-medium text-gray-800">{t.name}</td>
                        <td className="px-2 py-1 text-gray-500">{t.email||<span className="text-red-400 italic">no email</span>}</td>
                        <td className="px-2 py-1 text-indigo-700">{t.appraisal_qualification||"—"}</td>
                        <td className="px-2 py-1 text-gray-600">{t.subject}</td>
                        <td className="px-2 py-1 text-blue-700">{t.grade}</td>
                        <td className="px-2 py-1 text-green-700">{t.section}</td>
                        <td className="px-2 py-1 text-purple-700">{t.class_teacher||"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {importing && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Importing...</span><span>{importProgress}%</span></div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${importProgress}%` }} />
              </div>
            </div>
          )}
          {importResults && (
            <div className={`mb-3 p-3 rounded-lg border ${importResults.failed>0?"bg-yellow-50 border-yellow-200":"bg-green-50 border-green-200"}`}>
              <p className="text-sm font-semibold text-gray-700 mb-2">Import Complete</p>
              <div className="flex gap-4 text-xs flex-wrap mb-2">
                <span className="text-green-700 font-bold">✅ {importResults.success} created</span>
                {importResults.updated>0&&<span className="text-blue-700 font-bold">🔄 {importResults.updated} updated</span>}
                {importResults.skipped>0&&<span className="text-yellow-700 font-bold">⏭ {importResults.skipped} skipped (no email)</span>}
                {importResults.failed>0&&<span className="text-red-700 font-bold">❌ {importResults.failed} failed</span>}
              </div>
              {importResults.errors?.length>0&&(
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-red-200 rounded">
                    <thead><tr className="bg-red-100"><th className="px-2 py-1 text-left">Row</th><th className="px-2 py-1 text-left">Name</th><th className="px-2 py-1 text-left">Reason</th></tr></thead>
                    <tbody>
                      {importResults.errors.map((e: any, i: number) => (
                        <tr key={i} className="border-t border-red-100">
                          <td className="px-2 py-1 text-red-500">{e.row}</td>
                          <td className="px-2 py-1 text-gray-700">{e.name}</td>
                          <td className="px-2 py-1 text-red-600">{e.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {parsedTeachers.length>0&&!importResults&&(
            <button onClick={importAllTeachers} disabled={importing}
              className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold">
              {importing?"Importing...":`🚀 Import ${parsedTeachers.filter(t=>t.email).length} Teachers`}
            </button>
          )}
        </div>
      )}

      {/* ── ADD / EDIT FORM ── */}
      {showForm && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-bold text-gray-700 mb-1">
            {editUser ? `✏️ Edit — ${editUser.name}` : "➕ Add New Teacher"}
          </h2>
          {editUser && (
            <p className="text-xs text-indigo-600 mb-4">
              Subjects & Classes will be saved for academic year <strong>{academicYear}</strong>
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="col-span-3 flex items-center gap-4">
              <div className="relative">
                {form.photo ? (
                  <img src={form.photo} alt="photo" className="w-16 h-16 rounded-full object-cover border-2 border-indigo-300" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl border-2 border-indigo-200">👤</div>
                )}
                <button onClick={() => photoRef.current?.click()}
                  className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center hover:bg-indigo-700">📷</button>
                <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              </div>
              <div className="text-xs text-gray-500"><p className="font-medium">Profile Photo</p><p>Click the camera icon to upload</p></div>
            </div>
            {[
              { label: "Full Name *", key: "name", placeholder: "e.g. Priya Sharma" },
              { label: "Email *", key: "email", placeholder: "e.g. priya@school.com" },
              { label: editUser ? "Change Password (optional)" : "Password *", key: "password", placeholder: "e.g. Priya123" },
              { label: "Phone", key: "phone", placeholder: "e.g. 9876543210" },
              { label: "Class Teacher Of", key: "class_teacher_of", placeholder: "e.g. Grade 5 Kaveri" },
              { label: "Experience (years)", key: "experience", placeholder: "e.g. 5" },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder} className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full" />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Role</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full">
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
                <option value="principal">Principal</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Qualification</label>
              <select value={form.appraisal_qualification} onChange={e => setForm(p => ({ ...p, appraisal_qualification: e.target.value }))}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full">
                <option value="">-- Select --</option>
                {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
          </div>

          {/* Subjects */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-2 font-semibold">Subjects for {academicYear} ({form.subjects.length} selected)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {SUBJECTS.map(s => (
                <button key={s} onClick={() => toggleSubject(s)}
                  className={`px-3 py-1 text-xs rounded-full border font-medium transition-all ${form.subjects.includes(s)?"bg-indigo-600 text-white border-indigo-600":"bg-white text-gray-600 border-gray-300 hover:border-indigo-400"}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={customSubject} onChange={e => setCustomSubject(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter"&&customSubject.trim()) { setForm(p=>({...p,subjects:[...p.subjects,customSubject.trim()]})); setCustomSubject(""); }}}
                placeholder="Add custom subject (press Enter)" className="border border-gray-300 rounded px-2 py-1 text-xs flex-1" />
            </div>
            {form.subjects.length>0&&(
              <div className="flex flex-wrap gap-1 mt-2">
                {form.subjects.map(s => (
                  <span key={s} className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
                    {s}<button onClick={() => toggleSubject(s)} className="text-indigo-400 hover:text-red-500">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Classes */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-2 font-semibold">Assigned Classes for {academicYear} ({form.assigned_classes.length} selected)</label>
            <div className="flex flex-wrap gap-2">
              {CLASSES.map(c => (
                <button key={c} onClick={() => toggleClass(c)}
                  className={`px-3 py-1 text-xs rounded-full border font-medium transition-all ${form.assigned_classes.includes(c)?"bg-blue-600 text-white border-blue-600":"bg-white text-gray-600 border-gray-300 hover:border-blue-400"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-2 font-semibold">Assigned Sections ({form.assigned_sections.length} selected)</label>
            <div className="flex flex-wrap gap-2">
              {ALL_SECTIONS.map(s => (
                <button key={s} onClick={() => toggleSection(s)}
                  className={`px-3 py-1 text-xs rounded-full border font-medium transition-all ${form.assigned_sections.includes(s)?"bg-purple-600 text-white border-purple-600":"bg-white text-gray-600 border-gray-300 hover:border-purple-400"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-gray-100">
            <button onClick={saveUser} className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-semibold">
              💾 {editUser ? "Update Teacher" : "Save Teacher"}
            </button>
            <button onClick={() => { setShowForm(false); resetForm(); }}
              className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      {/* ── RESET PASSWORD MODAL ── */}
      {resetPwdUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            <h3 className="text-sm font-bold text-gray-800 mb-1">🔑 Reset Password</h3>
            <p className="text-xs text-gray-500 mb-4">{resetPwdUser.name}</p>
            <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="Enter new password" className="border border-gray-300 rounded px-3 py-2 text-sm w-full mb-3 font-mono" />
            <div className="flex gap-2">
              <button onClick={doResetPassword} className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-semibold">Reset</button>
              <button onClick={() => { setResetPwdUser(null); setNewPassword(""); }}
                className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY PANEL ── */}
      {historyUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800">📅 Assignment History — {historyUser.name}</h3>
              <button onClick={() => { setHistoryUser(null); setHistoryData([]); }} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            {historyData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No assignment history found.</p>
            ) : (
              <div className="space-y-3">
                {historyData.map(h => (
                  <div key={h.id} className="border border-gray-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-indigo-700 mb-1">{h.academic_year}</p>
                    <p className="text-xs text-gray-600"><span className="font-medium">Subjects:</span> {(h.subjects||[]).join(", ")||"—"}</p>
                    <p className="text-xs text-gray-600"><span className="font-medium">Classes:</span> {(h.assigned_classes||[]).join(", ")||"—"}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TABS ── */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setActiveTab("active")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab==="active"?"bg-indigo-600 text-white":"bg-white border border-gray-200 text-gray-600 hover:border-indigo-400"}`}>
          Active Teachers ({teachers.length})
        </button>
        <button onClick={() => setActiveTab("inactive")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab==="inactive"?"bg-red-600 text-white":"bg-white border border-gray-200 text-gray-600 hover:border-red-400"}`}>
          Deactivated ({inactiveUsers.length})
        </button>
      </div>

      {/* ── FILTER BAR ── */}
      {activeTab === "active" && (
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4 flex flex-wrap gap-3 items-end shadow-sm">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Search</label>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Name, email or subject..."
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-52" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Subject</label>
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">All Subjects</option>
              {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Grade</label>
            <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">All Grades</option>
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Qualification</label>
            <select value={filterQualification} onChange={e => setFilterQualification(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">All Qualifications</option>
              {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
          {(search||filterSubject||filterGrade||filterQualification) && (
            <button onClick={() => { setSearch(""); setFilterSubject(""); setFilterGrade(""); setFilterQualification(""); }}
              className="px-3 py-1.5 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-50">
              Clear Filters
            </button>
          )}
          <span className="text-xs text-gray-400 ml-auto self-center">{filtered.length} of {teachers.length} shown</span>
        </div>
      )}

      {/* ── ACTIVE TEACHERS TABLE ── */}
      {activeTab === "active" && (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden mb-4">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-700">
              Teachers — {academicYear} ({filtered.length})
            </h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No teachers found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                    <th className="px-3 py-2 text-center w-8">#</th>
                    <th className="px-3 py-2 text-left min-w-[160px]">Name</th>
                    <th className="px-3 py-2 text-left min-w-[80px]">Stage</th>
                    <th className="px-3 py-2 text-left min-w-[180px]">Email</th>
                    <th className="px-3 py-2 text-left min-w-[140px]">Subjects ({academicYear})</th>
                    <th className="px-3 py-2 text-left min-w-[140px]">Classes ({academicYear})</th>
                    <th className="px-3 py-2 text-left min-w-[120px]">Class Teacher</th>
                    <th className="px-3 py-2 text-left min-w-[100px]">Last Login</th>
                    <th className="px-3 py-2 text-center w-20">Credentials</th>
                    <th className="px-3 py-2 text-center w-16">Password</th>
                    <th className="px-3 py-2 text-center min-w-[160px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u, i) => {
                    const assignment = assignments[u.id];
                    const effectiveSubjects = assignment?.subjects || u.subjects || [];
                    const effectiveClasses = assignment?.assigned_classes || u.assigned_classes || [];
                    return (
                      <tr key={u.id} className={`border-b border-gray-100 hover:bg-indigo-50/30 ${i%2===0?"bg-white":"bg-gray-50"}`}>
                        <td className="px-3 py-2.5 text-center text-gray-400">{i+1}</td>
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
                              <button onClick={() => viewHistory(u)} className="font-medium text-gray-800 hover:text-indigo-600 text-left">
                                {u.name}
                              </button>
                              <p className="text-gray-400">{u.appraisal_qualification||"—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-0.5">
                            {getStages(effectiveClasses).map(s => (
                              <span key={s.label} className={`px-1.5 py-0.5 rounded text-xs font-medium ${s.color}`}>{s.label}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-gray-500">{u.email||"—"}</td>
                        <td className="px-3 py-2.5">
                          {effectiveSubjects.length>0 ? (
                            <div className="flex flex-wrap gap-1">
                              {effectiveSubjects.map((s: string) => (
                                <span key={s} className={`px-1.5 py-0.5 rounded text-xs font-medium ${assignment?"bg-indigo-100 text-indigo-700":"bg-gray-100 text-gray-500"}`}>{s}</span>
                              ))}
                              {assignment && <span className="text-indigo-400 text-xs">✓</span>}
                            </div>
                          ) : <span className="text-gray-300">Not assigned</span>}
                        </td>
                        <td className="px-3 py-2.5 text-gray-500">
                          {effectiveClasses.length>0 ? effectiveClasses.join(", ") : <span className="text-gray-300">Not assigned</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          {u.class_teacher_of ? (
                            <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-medium">👑 {u.class_teacher_of}</span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-gray-500">
                          <span className={u.last_login_at ? "text-green-600" : "text-gray-300 italic"}>
                            {formatDate(u.last_login_at)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {u.credentials_shared ? (
                            <span className="text-green-600 text-xs font-medium">✅ Shared</span>
                          ) : (
                            <span className="text-orange-500 text-xs font-medium">⚠️ Not sent</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button onClick={() => setShowPassword(p => ({ ...p, [u.id]: !p[u.id] }))}
                            className="text-gray-400 hover:text-indigo-600 text-xs">
                            {showPassword[u.id] ? "🔓" : "🔒"}
                          </button>
                          {showPassword[u.id] && (
                            <span className="block font-mono text-xs text-indigo-600 mt-0.5">{u.password||"—"}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex gap-1 justify-center flex-wrap">
                            <button onClick={() => openEdit(u)} title="Edit"
                              className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-xs font-medium">✏️</button>
                            <button onClick={() => { setResetPwdUser(u); setNewPassword(""); }} title="Reset Password"
                              className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 text-xs font-medium">🔑</button>
                            <button onClick={() => copyCredentials(u)} title="Copy Credentials"
                              className="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-xs font-medium">📋</button>
                            <button onClick={() => deactivateUser(u.id, u.name)} title="Deactivate"
                              className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs font-medium">🔴</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── INACTIVE TEACHERS TAB ── */}
      {activeTab === "inactive" && (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden mb-4">
          <div className="px-4 py-3 bg-red-50 border-b border-red-100">
            <h2 className="text-sm font-bold text-red-700">Deactivated Teachers ({inactiveUsers.length})</h2>
            <p className="text-xs text-red-500 mt-0.5">All data preserved — reactivate to restore access</p>
          </div>
          {inactiveUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No deactivated teachers</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Qualification</th>
                    <th className="px-3 py-2 text-left">Deactivated On</th>
                    <th className="px-3 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inactiveUsers.map((u, i) => (
                    <tr key={u.id} className={`border-b border-gray-100 ${i%2===0?"bg-white":"bg-gray-50"}`}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500 font-bold">
                            {u.name?.[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-600">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-400">{u.email||"—"}</td>
                      <td className="px-3 py-2.5 text-gray-500">{u.appraisal_qualification||"—"}</td>
                      <td className="px-3 py-2.5 text-red-500">{formatDate(u.deactivated_at)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => reactivateUser(u.id, u.name)}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-xs font-medium">
                            ✅ Reactivate
                          </button>
                          <button onClick={() => permanentDelete(u.id, u.name)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs font-medium">
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ADMINS TABLE ── */}
      {activeTab === "active" && admins.length > 0 && (
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
                <th className="px-3 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((u, i) => (
                <tr key={u.id} className={`border-b border-gray-100 ${i%2===0?"bg-white":"bg-gray-50"}`}>
                  <td className="px-3 py-2.5 text-center text-gray-400">{i+1}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-800">{u.name}</td>
                  <td className="px-3 py-2.5 text-gray-500">{u.email}</td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => openEdit(u)} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-xs">✏️</button>
                      <button onClick={() => deactivateUser(u.id, u.name)} className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs">🔴</button>
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
