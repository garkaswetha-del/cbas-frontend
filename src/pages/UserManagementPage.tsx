import { useState, useEffect, useRef, Fragment } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import AcademicYearSelect from "../components/AcademicYearSelect";
import { getAPI } from '../utils/api';

const API = getAPI();

const CLASSES = [
  "Pre-KG", "LKG", "UKG",
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5",
  "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10",
];

const QUALIFICATIONS = [
  "POST GRADUATION",
  "GRADUATION",
  "POST GRADUATION WITH BED",
  "GRADUATION WITH BED",
  "NTT",
  "POST GRADUATION WITH DED",
  "DED",
  "PTT",
  "GRADUATION WITH DED",
];

const STAGE_DEFS = [
  { label: "Foundation",  grades: ["Pre-KG","LKG","UKG","Grade 1","Grade 2"], color: "bg-green-100 text-green-800" },
  { label: "Preparatory", grades: ["Grade 3","Grade 4","Grade 5"],             color: "bg-blue-100 text-blue-800" },
  { label: "Middle",      grades: ["Grade 6","Grade 7","Grade 8"],             color: "bg-purple-100 text-purple-800" },
  { label: "Secondary",   grades: ["Grade 9","Grade 10"],                      color: "bg-orange-100 text-orange-800" },
];
const STAGE_ORDER = ["Foundation","Preparatory","Middle","Secondary"];

function getStages(cls: string[]) {
  const found = new Set<string>();
  (cls || []).forEach(c => { const d = STAGE_DEFS.find(d => d.grades.includes(c)); if (d) found.add(d.label); });
  return STAGE_DEFS.filter(d => found.has(d.label));
}
function primaryStageOrder(cls: string[]) {
  let min = 99;
  (cls || []).forEach(c => { const d = STAGE_DEFS.find(d => d.grades.includes(c)); if (d) { const i = STAGE_ORDER.indexOf(d.label); if (i < min) min = i; } });
  return min;
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
function autoPassword(name: string) { return name.split(/[\s.]/)[0] + Math.floor(100 + Math.random() * 900); }
function formatDate(d: string | null | undefined) {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
}

const EXCEL_TEACHERS: any[] = [
  { name:"Chandana.K", email:"chandanasindhu12@gmail.com", password:"Chandana589", subject:"English", grade:"Grade 8, Grade 9", section:"Orion, Pegasus, Centaurus, Himalaya", class_teacher:"", appraisal_qualification:"Post Graduation with BED" },
];

const TEACHING_ROLES = new Set(["teacher","ahm","principal"]);

type MainTab = "teachers" | "staff" | "inactive" | "grade-subjects";
type EditSubTab = "profile" | "assignments";

function buildEditRows(mappings: any[]) {
  // Group by grade: each row = one grade with multiple subjects + multiple sections
  const rowMap: Record<string, any> = {};
  for (const m of mappings) {
    if (!m.grade) continue;
    if (!rowMap[m.grade]) rowMap[m.grade] = { grade: m.grade, subjects: [], sections: [] };
    if (m.subject && !rowMap[m.grade].subjects.includes(m.subject)) rowMap[m.grade].subjects.push(m.subject);
    if (m.section && !rowMap[m.grade].sections.includes(m.section)) rowMap[m.grade].sections.push(m.section);
  }
  const result = Object.values(rowMap);
  return result.length > 0 ? result : [{ grade: "", subjects: [], sections: [] }];
}
function extractClassTeacher(mappings: any[]) {
  const ct = mappings.find(m => m.is_class_teacher);
  return { grade: ct?.grade || "", section: ct?.section || "" };
}

export default function UserManagementPage() {
  const [academicYear, setAcademicYear] = useState(() => {
    const now = new Date(); const yr = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
    return `${yr}-${String(yr + 1).slice(2)}`;
  });
  const currentAcademicYear = (() => {
    const now = new Date(); const yr = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
    return `${yr}-${String(yr + 1).slice(2)}`;
  })();

  const [users, setUsers] = useState<any[]>([]);
  const [inactiveUsers, setInactiveUsers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<Record<string, any>>({});
  const [allMappingsFlat, setAllMappingsFlat] = useState<Record<string, any[]>>({});
  const [assignmentsYear, setAssignmentsYear] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterQualification, setFilterQualification] = useState("");
  const [stageFilter, setStageFilter] = useState("Foundation");

  // Tabs
  const [mainTab, setMainTab] = useState<MainTab>("teachers");

  // Inline edit
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);
  const [editSubTab, setEditSubTab] = useState<EditSubTab>("profile");
  const [editProfileForm, setEditProfileForm] = useState<any>({});
  const [editRows, setEditRows] = useState<any[]>([{ grade: "", subjects: [], sections: [] }]);
  const [classTeacherGrade, setClassTeacherGrade] = useState("");
  const [classTeacherSection, setClassTeacherSection] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);

  // Add new teacher form (modal/panel at top)
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "", email: "", password: "", role: "teacher",
    phone: "", appraisal_qualification: "", experience: "", photo: "",
  });
  const [savingAdd, setSavingAdd] = useState(false);

  // Staff accounts edit (simple modal)
  const [editStaffUser, setEditStaffUser] = useState<any>(null);
  const [editStaffForm, setEditStaffForm] = useState<any>({});

  // Modals
  const [resetPwdUser, setResetPwdUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [historyUser, setHistoryUser] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [portfolioUser, setPortfolioUser] = useState<any>(null);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  // Import
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<any>(null);
  const [parsedTeachers, setParsedTeachers] = useState<any[]>([]);

  // Sections master
  const [allSectionsFull, setAllSectionsFull] = useState<{ grade: string; name: string }[]>([]);

  // Grade & Subject mapping data
  const [gradeSubjects, setGradeSubjects] = useState<Record<string, string[]>>({});
  const [gradeSubjectsList, setGradeSubjectsList] = useState<any[]>([]);
  const [newSubjectInputs, setNewSubjectInputs] = useState<Record<string, string>>({});

  const photoRef = useRef<HTMLInputElement>(null);
  const addPhotoRef = useRef<HTMLInputElement>(null);
  const xlsxRef = useRef<HTMLInputElement>(null);

  const showMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(""), 4500); };

  useEffect(() => {
    fetchUsers(); fetchStats(); fetchInactive(); fetchAssignments(); fetchAllSections();
  }, [academicYear]);

  useEffect(() => { fetchGradeSubjects(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try { const r = await axios.get(`${API}/users`); setUsers(r.data || []); } catch {}
    setLoading(false);
  };
  const fetchStats = async () => { try { const r = await axios.get(`${API}/users/stats`); setStats(r.data); } catch {} };
  const fetchInactive = async () => { try { const r = await axios.get(`${API}/users/inactive`); setInactiveUsers(r.data || []); } catch {} };

  const fetchAssignments = async () => {
    const year = academicYear;
    try {
      const r = await axios.get(`${API}/mappings/all?academic_year=${year}`);
      const map: Record<string, any> = {};
      const flat: Record<string, any[]> = {};
      (r.data || []).forEach((m: any) => {
        if (!map[m.teacher_id]) map[m.teacher_id] = { subjects: [], assigned_classes: [], class_teacher_of: "" };
        if (m.subject && !map[m.teacher_id].subjects.includes(m.subject)) map[m.teacher_id].subjects.push(m.subject);
        if (m.grade && !map[m.teacher_id].assigned_classes.includes(m.grade)) map[m.teacher_id].assigned_classes.push(m.grade);
        if (m.is_class_teacher && m.grade && m.section) map[m.teacher_id].class_teacher_of = `${m.grade} ${m.section}`;
        if (!flat[m.teacher_id]) flat[m.teacher_id] = [];
        flat[m.teacher_id].push(m);
      });
      setAssignments(map); setAllMappingsFlat(flat); setAssignmentsYear(year);
    } catch {}
  };

  const fetchAllSections = async () => {
    try {
      const r = await axios.get(`${API}/sections/counts?academic_year=${academicYear}`);
      const active = (r.data || []).filter((s: any) => s.is_active !== false);
      setAllSectionsFull(active.map((s: any) => ({ grade: s.grade, name: s.name })));
    } catch {}
  };

  const fetchGradeSubjects = async () => {
    try {
      const [r1, r2] = await Promise.all([
        axios.get(`${API}/grade-subjects`),
        axios.get(`${API}/grade-subjects/list`),
      ]);
      setGradeSubjects(r1.data || {});
      setGradeSubjectsList(r2.data || []);
    } catch {}
  };

  // ── Computed lists ──
  const assignmentsReady = assignmentsYear === academicYear;
  const teachers = !assignmentsReady ? [] : users.filter(u => TEACHING_ROLES.has(u.role) && !!assignments[u.id]);
  const allActiveTeachers = users.filter(u => TEACHING_ROLES.has(u.role) && u.is_active !== false);
  const admins = users.filter(u => u.role === "admin");
  const ahms = users.filter(u => u.role === "ahm");
  const principals = users.filter(u => u.role === "principal");
  const staffAccounts = [...principals, ...ahms, ...admins];

  const yearStats = assignmentsReady && Object.keys(assignments).length > 0 ? {
    total: allActiveTeachers.length,
    inactive: inactiveUsers.filter((u: any) => u.role === "teacher").length,
    byQualification: Object.entries(
      allActiveTeachers.reduce((acc: Record<string, number>, u: any) => {
        const q = (u.appraisal_qualification || u.qualification || "Unknown").toUpperCase().replace(/B\.ED/g,"BED").replace(/D\.ED/g,"DED");
        acc[q] = (acc[q] || 0) + 1; return acc;
      }, {})
    ).map(([qualification, count]) => ({ qualification, count })).sort((a,b) => (b.count as number) - (a.count as number)),
  } : stats;

  const filtered = teachers.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !search || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || (u.subjects || []).join(" ").toLowerCase().includes(q);
    const asgn = assignments[u.id];
    const subs = asgn?.subjects || [];
    const cls  = asgn?.assigned_classes || [];
    const matchSubject = !filterSubject || subs.some((s: string) => s.toLowerCase().includes(filterSubject.toLowerCase()));
    const matchGrade = !filterGrade || cls.includes(filterGrade);
    const matchQual = !filterQualification || (u.appraisal_qualification || "").toUpperCase() === filterQualification.toUpperCase();
    return matchSearch && matchSubject && matchGrade && matchQual;
  }).sort((a, b) => {
    const ac = assignments[a.id]?.assigned_classes || []; const bc = assignments[b.id]?.assigned_classes || [];
    return primaryStageOrder(ac) - primaryStageOrder(bc);
  });

  const stageFiltered = filtered.filter(u => {
    const cls = assignments[u.id]?.assigned_classes || u.assigned_classes || [];
    return STAGE_ORDER[primaryStageOrder(cls)] === stageFilter;
  });

  // ── Inline edit ──
  const toggleEdit = (u: any) => {
    if (expandedTeacherId === u.id) { setExpandedTeacherId(null); return; }
    setExpandedTeacherId(u.id);
    setEditSubTab("profile");
    setEditProfileForm({
      name: u.name || "", email: u.email || "", password: "", role: u.role || "teacher",
      phone: u.phone || "", appraisal_qualification: u.appraisal_qualification || u.qualification || "",
      experience: u.experience || "", photo: u.photo || "",
    });
    const flatMappings = allMappingsFlat[u.id] || [];
    setEditRows(buildEditRows(flatMappings));
    const ct = extractClassTeacher(flatMappings);
    setClassTeacherGrade(ct.grade);
    setClassTeacherSection(ct.section);
  };

  const saveProfile = async () => {
    if (!expandedTeacherId) return;
    setSavingProfile(true);
    try {
      const payload: any = { ...editProfileForm };
      if (!payload.password) delete payload.password;
      await axios.patch(`${API}/users/${expandedTeacherId}`, payload);
      showMsg("✅ Profile updated");
      fetchUsers();
    } catch (e: any) { showMsg("❌ " + (e?.response?.data?.message || "Error saving profile")); }
    setSavingProfile(false);
  };

  const saveAssignments = async () => {
    if (!expandedTeacherId) return;
    setSavingAssignments(true);
    const mappings: any[] = [];
    for (const row of editRows) {
      if (!row.grade) continue;
      const secs = row.sections.length > 0 ? row.sections : [""];
      const subs: (string | null)[] = row.subjects.length > 0 ? row.subjects : [null];
      for (const sec of secs) {
        for (const sub of subs) {
          mappings.push({
            grade: row.grade,
            section: sec,
            subject: sub,
            is_class_teacher: row.grade === classTeacherGrade && sec === classTeacherSection,
          });
        }
      }
    }
    try {
      await axios.post(`${API}/mappings/save`, { teacher_id: expandedTeacherId, academic_year: academicYear, mappings });
      showMsg(`✅ Assignments saved for ${academicYear}`);
      // Re-fetch from DB and refresh both the summary table and the open edit panel
      const r = await axios.get(`${API}/mappings/all?academic_year=${academicYear}`);
      const map: Record<string, any> = {};
      const flat: Record<string, any[]> = {};
      (r.data || []).forEach((m: any) => {
        if (!map[m.teacher_id]) map[m.teacher_id] = { subjects: [], assigned_classes: [], class_teacher_of: "" };
        if (m.subject && !map[m.teacher_id].subjects.includes(m.subject)) map[m.teacher_id].subjects.push(m.subject);
        if (m.grade && !map[m.teacher_id].assigned_classes.includes(m.grade)) map[m.teacher_id].assigned_classes.push(m.grade);
        if (m.is_class_teacher && m.grade && m.section) map[m.teacher_id].class_teacher_of = `${m.grade} ${m.section}`;
        if (!flat[m.teacher_id]) flat[m.teacher_id] = [];
        flat[m.teacher_id].push(m);
      });
      setAssignments(map);
      setAllMappingsFlat(flat);
      setAssignmentsYear(academicYear);
      // Refresh the open edit panel so it reflects exactly what is now in the DB
      const freshMappings = flat[expandedTeacherId!] || [];
      setEditRows(buildEditRows(freshMappings));
      const ct = extractClassTeacher(freshMappings);
      setClassTeacherGrade(ct.grade);
      setClassTeacherSection(ct.section);
    } catch (e: any) { showMsg("❌ " + (e?.response?.data?.message || "Error saving assignments")); }
    setSavingAssignments(false);
  };

  // ── Add new teacher ──
  const saveNewTeacher = async () => {
    if (!addForm.name || !addForm.email || !addForm.password) { showMsg("❌ Name, Email and Password are required"); return; }
    setSavingAdd(true);
    try {
      await axios.post(`${API}/users`, addForm);
      showMsg("✅ Teacher created");
      setShowAddForm(false);
      setAddForm({ name:"",email:"",password:"",role:"teacher",phone:"",appraisal_qualification:"",experience:"",photo:"" });
      fetchUsers(); fetchStats();
    } catch (e: any) { showMsg("❌ " + (e?.response?.data?.message || "Error creating teacher")); }
    setSavingAdd(false);
  };

  // ── Staff accounts edit ──
  const openStaffEdit = (u: any) => {
    setEditStaffUser(u);
    setEditStaffForm({ name: u.name||"", email: u.email||"", password: "", role: u.role||"admin", phone: u.phone||"", appraisal_qualification: u.appraisal_qualification||"", experience: u.experience||"" });
  };
  const saveStaffEdit = async () => {
    if (!editStaffUser) return;
    try {
      const payload: any = { ...editStaffForm };
      if (!payload.password) delete payload.password;
      await axios.patch(`${API}/users/${editStaffUser.id}`, payload);
      showMsg("✅ Staff account updated"); setEditStaffUser(null); fetchUsers();
    } catch (e: any) { showMsg("❌ " + (e?.response?.data?.message || "Error saving")); }
  };

  // ── User actions ──
  const deactivateUser = async (id: string, name: string) => {
    if (!confirm(`Deactivate ${name}? They will lose login access but all data is kept.`)) return;
    try { await axios.patch(`${API}/users/${id}/deactivate`); showMsg(`✅ ${name} deactivated`); fetchUsers(); fetchInactive(); fetchStats(); } catch { showMsg("❌ Error deactivating"); }
  };
  const reactivateUser = async (id: string, name: string) => {
    try { await axios.patch(`${API}/users/${id}/reactivate`); showMsg(`✅ ${name} reactivated`); fetchUsers(); fetchInactive(); fetchStats(); } catch { showMsg("❌ Error reactivating"); }
  };
  const permanentDelete = async (id: string, name: string) => {
    if (!confirm(`Permanently delete ${name}? This cannot be undone.`)) return;
    try { await axios.delete(`${API}/users/${id}/permanent`); showMsg(`✅ ${name} deleted`); fetchInactive(); fetchStats(); } catch { showMsg("❌ Error deleting"); }
  };
  const doResetPassword = async () => {
    if (!newPassword.trim()) { showMsg("❌ Enter a new password"); return; }
    try { await axios.patch(`${API}/users/${resetPwdUser.id}/reset-password`, { password: newPassword }); showMsg(`✅ Password reset for ${resetPwdUser.name}`); setResetPwdUser(null); setNewPassword(""); fetchUsers(); } catch { showMsg("❌ Error resetting password"); }
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
    try { const r = await axios.get(`${API}/teacher-assignments/history/${u.id}`); setHistoryData(r.data || []); } catch { setHistoryData([]); }
  };
  const openPortfolio = async (u: any) => {
    setPortfolioUser(u); setPortfolioData(null); setPortfolioLoading(true);
    try { const r = await axios.get(`${API}/portfolio/teacher/${u.id}`); setPortfolioData(r.data); } catch { setPortfolioData(null); }
    setPortfolioLoading(false);
  };
  const downloadCredentials = () => {
    const rows = users.filter((u: any) => u.role === "teacher").map((u: any) => ({ "Name": u.name||"", "User ID (Email)": u.email||"", "Password": u.password||"" }));
    const ws = XLSX.utils.json_to_sheet(rows); ws["!cols"] = [{ wch:30 },{ wch:35 },{ wch:20 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Teacher Login Credentials");
    XLSX.writeFile(wb, `teacher_credentials_${academicYear}.xlsx`);
  };

  // ── Import ──
  const handleExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const wb = XLSX.read(ev.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const parsed = rows.map(row => ({
        name: pick(row,"Name","Teacher Name","name"),
        email: pick(row,"Email ID","Email","email"),
        subject: pick(row,"Subject handling","Subject","Subjects"),
        grade: pick(row,"Grade","Grades","Class"),
        section: pick(row,"Section","Sections"),
        class_teacher: pick(row,"Class teacher for grade","Class Teacher","class teacher"),
        appraisal_qualification: pick(row,"Appraisal qualification","Appraisal Qualification","Qualification"),
        password: autoPassword(pick(row,"Name","Teacher Name","name")),
      })).filter(t => t.name);
      setParsedTeachers(parsed); setImportResults(null);
    };
    reader.readAsBinaryString(file);
  };

  const buildMappingRows = (grades: string[], sections: string[], subjects: string[], classTeacherOf: string) => {
    const rows: any[] = [];
    const ctRaw = (classTeacherOf || "").trim();
    let ctGrade = "", ctSection = "";
    if (ctRaw) {
      const parts = ctRaw.split(/\s+/);
      if (parts[0].toLowerCase() === "grade" && parts.length >= 3) { ctGrade = `Grade ${parts[1]}`; ctSection = parts.slice(2).join(" "); }
      else if (parts.length >= 2) { ctGrade = parts[0]; ctSection = parts.slice(1).join(" "); }
    }
    for (const grade of grades) {
      const gradeSections = sections.filter(sec => allSectionsFull.some(s => s.grade === grade && s.name === sec));
      const sectionsToUse = gradeSections.length > 0 ? gradeSections : sections;
      for (const section of sectionsToUse) {
        const isClassTeacher = ctGrade === grade && ctSection === section;
        for (const subject of (subjects.length > 0 ? subjects : [null as any])) {
          rows.push({ grade, section, subject, is_class_teacher: isClassTeacher });
        }
      }
    }
    return rows;
  };

  const importAllTeachers = async () => {
    const list = parsedTeachers.length > 0 ? parsedTeachers : EXCEL_TEACHERS;
    setImporting(true); setImportProgress(0);
    let success = 0, updated = 0, skipped = 0, failed = 0;
    const errors: any[] = [];
    const emailToUser: Record<string, any> = {};
    users.forEach(u => { if (u.email) emailToUser[u.email.toLowerCase()] = u; });
    for (let i = 0; i < list.length; i++) {
      const t = list[i];
      setImportProgress(Math.round(((i + 1) / list.length) * 100));
      if (!t.email) { skipped++; continue; }
      const grades = parseGrade(t.grade || "");
      const sections = (t.section || "").split(/[,;]/).map((s: string) => s.trim().replace(/^\d+[-–]\s*/i,"").trim()).filter(Boolean);
      const subjects = (t.subject || "").split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
      const mappingRows = buildMappingRows(grades, sections, subjects, t.class_teacher || "");
      const payload = { name: t.name, email: t.email, password: t.password || autoPassword(t.name), role:"teacher", subjects, assigned_classes: grades, assigned_sections: sections, class_teacher_of: t.class_teacher||"", appraisal_qualification: t.appraisal_qualification||"" };
      let userId: string | null = null;
      try { const res = await axios.post(`${API}/users`, payload); userId = res.data.id; success++; }
      catch (e: any) {
        const msg = e?.response?.data?.message || "";
        if (msg.toLowerCase().includes("already") || e?.response?.status === 409) {
          const existing = emailToUser[t.email.toLowerCase()];
          if (existing) { userId = existing.id; try { await axios.patch(`${API}/users/${existing.id}`, { appraisal_qualification: t.appraisal_qualification, subjects, assigned_classes: grades, class_teacher_of: t.class_teacher||"" }); updated++; } catch { skipped++; userId = null; } }
          else skipped++;
        } else { failed++; errors.push({ row: i+1, name: t.name, reason: msg || "Unknown error" }); }
      }
      if (userId && mappingRows.length > 0) { try { await axios.post(`${API}/mappings/save`, { teacher_id: userId, academic_year: academicYear, mappings: mappingRows }); } catch {} }
      await new Promise(r => setTimeout(r, 80));
    }
    setImportResults({ success, updated, skipped, failed, errors });
    setImporting(false); fetchUsers(); fetchAssignments(); fetchStats();
  };

  // ── Grade & Subject Mapping ──
  const addGradeSubject = async (grade: string) => {
    const subject = (newSubjectInputs[grade] || "").trim();
    if (!subject) return;
    try {
      await axios.post(`${API}/grade-subjects`, { grade, subject });
      setNewSubjectInputs(p => ({ ...p, [grade]: "" }));
      fetchGradeSubjects();
    } catch { showMsg("❌ Error adding subject"); }
  };
  const removeGradeSubject = async (id: string) => {
    try { await axios.delete(`${API}/grade-subjects/${id}`); fetchGradeSubjects(); } catch { showMsg("❌ Error removing subject"); }
  };

  // ── Assignment row helpers ──
  const updateEditRowGrade = (i: number, grade: string) => {
    setEditRows(rows => rows.map((r, idx) => idx === i ? { ...r, grade, subjects: [], sections: [] } : r));
  };
  const toggleSubjectInRow = (rowIdx: number, sub: string) => {
    setEditRows(rows => rows.map((r, i) => i !== rowIdx ? r : {
      ...r, subjects: r.subjects.includes(sub) ? r.subjects.filter((s: string) => s !== sub) : [...r.subjects, sub]
    }));
  };
  const toggleSection = (rowIdx: number, sec: string) => {
    setEditRows(rows => rows.map((r, i) => i !== rowIdx ? r : {
      ...r, sections: r.sections.includes(sec) ? r.sections.filter((s: string) => s !== sec) : [...r.sections, sec]
    }));
  };
  const addEditRow = () => setEditRows(r => [...r, { grade: "", subjects: [], sections: [] }]);
  const removeEditRow = (i: number) => setEditRows(r => r.filter((_,idx) => idx !== i));

  // ── Photo helpers ──
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (p: string) => void) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = ev => setter(ev.target?.result as string); reader.readAsDataURL(file);
  };

  const COLS = 11;

  return (
    <div className="p-3 sm:p-6">

      {/* ── HEADER ── */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">User Management</h1>
          <p className="text-sm text-gray-500">Manage teachers, staff and class assignments</p>
        </div>
        <div className="flex gap-2 items-end flex-wrap">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Academic Year</label>
            <AcademicYearSelect value={academicYear} onChange={v => { setAcademicYear(v); setExpandedTeacherId(null); }} />
          </div>
          <button onClick={() => setShowImport(true)} className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium">📥 Import</button>
          <button onClick={downloadCredentials} className="px-3 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 font-medium">📋 Credentials</button>
          <button onClick={() => setShowAddForm(true)} className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-medium">+ Add Teacher</button>
        </div>
      </div>

      {/* ── STATS ── */}
      {yearStats && (
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-indigo-700">{yearStats.total}</p>
              <p className="text-xs text-gray-500 mt-0.5">Active Teachers</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-red-500">{yearStats.inactive}</p>
              <p className="text-xs text-gray-500 mt-0.5">Deactivated</p>
            </div>
          </div>
          {(yearStats.byQualification || []).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(yearStats.byQualification || []).map((q: any) => (
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
        <div className={`mb-4 px-4 py-2 rounded text-sm border ${message.startsWith("✅")||message.startsWith("📋") ? "bg-green-50 border-green-300 text-green-800" : "bg-red-50 border-red-300 text-red-800"}`}>{message}</div>
      )}

      {/* ── ADD NEW TEACHER MODAL ── */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-800">➕ Add New Teacher</h2>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4 mb-2">
                <div className="relative">
                  {addForm.photo ? <img src={addForm.photo} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-indigo-300" /> : <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-xl border-2 border-indigo-200">👤</div>}
                  <button onClick={() => addPhotoRef.current?.click()} className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">📷</button>
                  <input ref={addPhotoRef} type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e, v => setAddForm(p => ({ ...p, photo: v })))} />
                </div>
                <p className="text-xs text-gray-400">Click camera to upload photo</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:"Full Name *", key:"name", placeholder:"e.g. Priya Sharma" },
                  { label:"Email *", key:"email", placeholder:"e.g. priya@school.com" },
                  { label:"Password *", key:"password", placeholder:"e.g. Priya123" },
                  { label:"Phone", key:"phone", placeholder:"9876543210" },
                  { label:"Experience (yrs)", key:"experience", placeholder:"e.g. 5" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                    <input value={(addForm as any)[f.key]} onChange={e => setAddForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full" />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Role</label>
                  <select value={addForm.role} onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))} className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full">
                    <option value="teacher">Teacher</option>
                    <option value="ahm">AHM</option>
                    <option value="admin">Admin</option>
                    <option value="principal">Principal</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Qualification</label>
                  <select value={addForm.appraisal_qualification} onChange={e => setAddForm(p => ({ ...p, appraisal_qualification: e.target.value }))} className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full">
                    <option value="">-- Select --</option>
                    {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-xs text-indigo-600 bg-indigo-50 px-3 py-2 rounded-lg">After creating, use the Edit button in the teacher table to assign classes and subjects for each academic year.</p>
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button onClick={saveNewTeacher} disabled={savingAdd} className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50">
                  {savingAdd ? "Saving..." : "💾 Create Teacher"}
                </button>
                <button onClick={() => setShowAddForm(false)} className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── IMPORT PANEL ── */}
      {showImport && (
        <div className="bg-white rounded-xl shadow border border-gray-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700">📥 Import Teachers from Excel</h2>
            <button onClick={() => { setShowImport(false); setImportResults(null); setParsedTeachers([]); if (xlsxRef.current) xlsxRef.current.value = ""; }} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
          </div>
          <div className="mb-4 p-4 border-2 border-dashed border-indigo-300 rounded-lg bg-indigo-50 flex flex-col items-center gap-2">
            <p className="text-xs text-indigo-700 font-medium">Upload Excel (.xlsx / .xls)</p>
            <p className="text-xs text-gray-500">Columns: Name, Email ID, Appraisal qualification, Subject handling, Grade, Section, Class teacher for grade</p>
            <input ref={xlsxRef} type="file" accept=".xlsx,.xls" onChange={handleExcelFile} className="text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:bg-indigo-600 file:text-white file:text-xs file:cursor-pointer" />
          </div>
          {parsedTeachers.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-semibold text-indigo-800 mb-2">{parsedTeachers.length} teachers parsed — {parsedTeachers.filter(t=>!t.email).length} will be skipped (no email)</p>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-indigo-700 text-white">{["#","Name","Email","Qualification","Subject","Grade","Section","Class Teacher"].map(h => <th key={h} className="px-2 py-1 text-left">{h}</th>)}</tr></thead>
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
              <div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${importProgress}%` }} /></div>
            </div>
          )}
          {importResults && (
            <div className={`mb-3 p-3 rounded-lg border ${importResults.failed>0?"bg-yellow-50 border-yellow-200":"bg-green-50 border-green-200"}`}>
              <p className="text-sm font-semibold text-gray-700 mb-2">Import Complete</p>
              <div className="flex gap-4 text-xs flex-wrap mb-2">
                <span className="text-green-700 font-bold">✅ {importResults.success} created</span>
                {importResults.updated>0&&<span className="text-blue-700 font-bold">🔄 {importResults.updated} updated</span>}
                {importResults.skipped>0&&<span className="text-yellow-700 font-bold">⏭ {importResults.skipped} skipped</span>}
                {importResults.failed>0&&<span className="text-red-700 font-bold">❌ {importResults.failed} failed</span>}
              </div>
            </div>
          )}
          {parsedTeachers.length>0&&!importResults&&(
            <button onClick={importAllTeachers} disabled={importing} className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-semibold">
              {importing?"Importing...":`🚀 Import ${parsedTeachers.filter(t=>t.email).length} Teachers`}
            </button>
          )}
        </div>
      )}

      {/* ── MAIN TABS ── */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {([
          { key:"teachers",       label:`Teachers (${allActiveTeachers.length})`,     color:"indigo" },
          { key:"staff",          label:`Staff Accounts (${staffAccounts.length})`,  color:"teal" },
          { key:"inactive",       label:`Inactive (${inactiveUsers.length})`,         color:"red" },
          { key:"grade-subjects", label:"Grade & Subject Mapping",                    color:"purple" },
        ] as const).map(t => (
          <button key={t.key} onClick={() => { setMainTab(t.key); setExpandedTeacherId(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${mainTab===t.key ? `bg-${t.color}-600 text-white shadow-sm` : `bg-white border border-gray-200 text-gray-600 hover:border-${t.color}-400`}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ────────────────── TEACHERS TAB ────────────────── */}
      {mainTab === "teachers" && (
        <>
          {/* Stage tabs */}
          <div className="flex gap-2 flex-wrap mb-4">
            {[
              { label:"Foundation",  sub:"Pre-KG – Grade 2", active:"bg-green-600 text-white",  inactive:"bg-white text-green-700 border border-green-300 hover:bg-green-50" },
              { label:"Preparatory", sub:"Grade 3–5",         active:"bg-blue-600 text-white",   inactive:"bg-white text-blue-700 border border-blue-300 hover:bg-blue-50" },
              { label:"Middle",      sub:"Grade 6–8",         active:"bg-purple-600 text-white", inactive:"bg-white text-purple-700 border border-purple-300 hover:bg-purple-50" },
              { label:"Secondary",   sub:"Grade 9–10",        active:"bg-orange-500 text-white", inactive:"bg-white text-orange-700 border border-orange-300 hover:bg-orange-50" },
            ].map(tab => {
              const count = filtered.filter(u => STAGE_ORDER[primaryStageOrder(assignments[u.id]?.assigned_classes || [])] === tab.label).length;
              return (
                <button key={tab.label} onClick={() => setStageFilter(tab.label)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${stageFilter===tab.label ? tab.active : tab.inactive}`}>
                  {tab.label} <span className="ml-1 text-xs opacity-80">({count})</span>
                  <div className="text-xs font-normal opacity-70">{tab.sub}</div>
                </button>
              );
            })}
          </div>

          {/* Filter bar */}
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4 flex flex-wrap gap-3 items-end shadow-sm">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Search</label>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, email or subject..." className="border border-gray-300 rounded px-3 py-1.5 text-sm w-48" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Subject</label>
              <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="">All Subjects</option>
                {Object.values(gradeSubjects).flat().filter((v,i,a)=>a.indexOf(v)===i).sort().map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Grade</label>
              <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="">All Grades</option>
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Qualification</label>
              <select value={filterQualification} onChange={e => setFilterQualification(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="">All</option>
                {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            {(search||filterSubject||filterGrade||filterQualification) && (
              <button onClick={() => { setSearch(""); setFilterSubject(""); setFilterGrade(""); setFilterQualification(""); }} className="px-3 py-1.5 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-50">Clear</button>
            )}
            <span className="text-xs text-gray-400 ml-auto self-center">{stageFiltered.length} of {teachers.length} shown</span>
          </div>

          {/* Teacher table */}
          <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden mb-4">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-700">{stageFilter} Teachers — {academicYear} ({stageFiltered.length})</h2>
            </div>
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
            ) : stageFiltered.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No teachers found for this stage and year.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                      <th className="px-3 py-2 text-center w-8">#</th>
                      <th className="px-3 py-2 text-left min-w-[160px]">Name</th>
                      <th className="px-3 py-2 text-left min-w-[80px]">Stage</th>
                      <th className="px-3 py-2 text-left min-w-[180px]">Email</th>
                      <th className="px-3 py-2 text-left min-w-[160px]">Subjects ({academicYear})</th>
                      <th className="px-3 py-2 text-left min-w-[130px]">Classes</th>
                      <th className="px-3 py-2 text-left min-w-[120px]">Class Teacher</th>
                      <th className="px-3 py-2 text-left min-w-[90px]">Last Login</th>
                      <th className="px-3 py-2 text-center w-20">Cred.</th>
                      <th className="px-3 py-2 text-center w-16">Pwd</th>
                      <th className="px-3 py-2 text-center min-w-[180px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stageFiltered.map((u, i) => {
                      const asgn = assignments[u.id];
                      const isPast = academicYear < currentAcademicYear;
                      const subs   = asgn?.subjects?.length      > 0 ? asgn.subjects      : (isPast ? (u.subjects||[])        : []);
                      const cls    = asgn?.assigned_classes?.length > 0 ? asgn.assigned_classes : (isPast ? (u.assigned_classes||[]) : []);
                      const ct     = asgn?.class_teacher_of || (isPast ? (u.class_teacher_of||"") : "");
                      const isOpen = expandedTeacherId === u.id;
                      return (
                        <Fragment key={u.id}>
                          <tr className={`border-b border-gray-100 transition-colors ${isOpen ? "bg-indigo-50 border-indigo-200" : i%2===0?"bg-white":"bg-gray-50"} hover:bg-indigo-50/40`}>
                            <td className="px-3 py-2.5 text-center text-gray-400">{i+1}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                {u.photo ? <img src={u.photo} alt="" className="w-7 h-7 rounded-full object-cover border border-gray-200 flex-shrink-0" /> : <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs flex-shrink-0 text-indigo-600 font-bold">{u.name?.[0]?.toUpperCase()}</div>}
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <button onClick={() => viewHistory(u)} className="font-medium text-gray-800 hover:text-indigo-600 text-left">{u.name}</button>
                                    {u.role==="ahm" && <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-teal-100 text-teal-700">AHM</span>}
                                    {u.role==="principal" && <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">Principal</span>}
                                  </div>
                                  <p className="text-gray-400">{u.appraisal_qualification||"—"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-col gap-0.5">
                                {getStages(cls).map(s => <span key={s.label} className={`px-1.5 py-0.5 rounded text-xs font-medium ${s.color}`}>{s.label}</span>)}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-gray-500">{u.email||"—"}</td>
                            <td className="px-3 py-2.5">
                              {subs.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {subs.map((s: string) => <span key={s} className="px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">{s}</span>)}
                                  {asgn && <span className="text-indigo-400 text-xs">✓</span>}
                                </div>
                              ) : <span className="text-gray-300">Not assigned</span>}
                            </td>
                            <td className="px-3 py-2.5 text-gray-500">{cls.length > 0 ? cls.join(", ") : <span className="text-gray-300">—</span>}</td>
                            <td className="px-3 py-2.5">
                              {ct ? <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-medium">👑 {ct}</span> : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={u.last_login_at ? "text-green-600" : "text-gray-300 italic"}>{formatDate(u.last_login_at)}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {u.credentials_shared ? (
                                <button onClick={() => copyCredentials(u)} className="text-green-600 text-xs font-medium hover:text-green-700">✅</button>
                              ) : (
                                <button onClick={() => copyCredentials(u)} className="text-orange-500 text-xs font-medium hover:text-orange-600">⚠️ Send</button>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <button onClick={() => setShowPassword(p => ({ ...p, [u.id]: !p[u.id] }))} className="text-gray-400 hover:text-indigo-600 text-xs">{showPassword[u.id]?"🔓":"🔒"}</button>
                              {showPassword[u.id] && <span className="block font-mono text-xs text-indigo-600 mt-0.5">{u.password||"—"}</span>}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <div className="flex gap-1 justify-center flex-wrap">
                                <button onClick={() => toggleEdit(u)} title={isOpen?"Close Edit":"Edit"} className={`px-2 py-1 rounded text-xs font-medium ${isOpen?"bg-indigo-600 text-white":"bg-indigo-100 text-indigo-700 hover:bg-indigo-200"}`}>✏️ {isOpen?"▲":"▼"}</button>
                                <button onClick={() => { setResetPwdUser(u); setNewPassword(""); }} title="Reset Password" className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 text-xs font-medium">🔑</button>
                                <button onClick={() => openPortfolio(u)} title="Portfolio" className="px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-xs font-medium">📋</button>
                                <button onClick={() => deactivateUser(u.id, u.name)} title="Deactivate" className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs font-medium">🔴</button>
                              </div>
                            </td>
                          </tr>

                          {/* ── INLINE EDIT PANEL ── */}
                          {isOpen && (
                            <tr>
                              <td colSpan={COLS} className="p-0 border-b-2 border-indigo-300">
                                <div className="bg-indigo-50 border-t border-indigo-200">
                                  {/* Sub-tab bar */}
                                  <div className="flex gap-0 border-b border-indigo-200">
                                    <button onClick={() => setEditSubTab("profile")} className={`px-5 py-2.5 text-xs font-semibold border-r border-indigo-200 transition-colors ${editSubTab==="profile"?"bg-white text-indigo-700 border-b-2 border-b-indigo-600":"text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100"}`}>
                                      👤 Profile
                                    </button>
                                    <button onClick={() => setEditSubTab("assignments")} className={`px-5 py-2.5 text-xs font-semibold transition-colors ${editSubTab==="assignments"?"bg-white text-indigo-700 border-b-2 border-b-indigo-600":"text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100"}`}>
                                      📚 Assignments — {academicYear}
                                    </button>
                                    <div className="ml-auto px-3 py-2">
                                      <button onClick={() => setExpandedTeacherId(null)} className="text-gray-400 hover:text-gray-600 text-sm">✕ Close</button>
                                    </div>
                                  </div>

                                  {/* Profile sub-tab */}
                                  {editSubTab === "profile" && (
                                    <div className="p-4">
                                      <div className="flex items-center gap-4 mb-4">
                                        <div className="relative">
                                          {editProfileForm.photo ? <img src={editProfileForm.photo} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-indigo-300" /> : <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-xl border-2 border-indigo-200">👤</div>}
                                          <button onClick={() => photoRef.current?.click()} className="absolute -bottom-1 -right-1 bg-indigo-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">📷</button>
                                          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(e, v => setEditProfileForm((p: any) => ({ ...p, photo: v })))} />
                                        </div>
                                        <p className="text-xs text-gray-500">Click camera icon to change photo</p>
                                      </div>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                                        {[
                                          { label:"Full Name", key:"name" },
                                          { label:"Email", key:"email" },
                                          { label:"New Password (optional)", key:"password" },
                                          { label:"Phone", key:"phone" },
                                          { label:"Experience (yrs)", key:"experience" },
                                        ].map(f => (
                                          <div key={f.key}>
                                            <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                                            <input value={editProfileForm[f.key]||""} onChange={e => setEditProfileForm((p: any) => ({ ...p, [f.key]: e.target.value }))} className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full bg-white" />
                                          </div>
                                        ))}
                                        <div>
                                          <label className="text-xs text-gray-500 block mb-1">Role</label>
                                          <select value={editProfileForm.role||"teacher"} onChange={e => setEditProfileForm((p: any) => ({ ...p, role: e.target.value }))} className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full bg-white">
                                            <option value="teacher">Teacher</option>
                                            <option value="ahm">AHM</option>
                                            <option value="admin">Admin</option>
                                            <option value="principal">Principal</option>
                                          </select>
                                        </div>
                                        <div>
                                          <label className="text-xs text-gray-500 block mb-1">Qualification</label>
                                          <select value={editProfileForm.appraisal_qualification||""} onChange={e => setEditProfileForm((p: any) => ({ ...p, appraisal_qualification: e.target.value }))} className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full bg-white">
                                            <option value="">-- Select --</option>
                                            {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
                                          </select>
                                        </div>
                                      </div>
                                      <button onClick={saveProfile} disabled={savingProfile} className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50">
                                        {savingProfile ? "Saving..." : "💾 Save Profile"}
                                      </button>
                                    </div>
                                  )}

                                  {/* Assignments sub-tab */}
                                  {editSubTab === "assignments" && (
                                    <div className="p-4">
                                      <div className="bg-white border border-indigo-100 rounded-lg px-3 py-2 mb-4 text-xs text-indigo-700">
                                        Editing <strong>{academicYear}</strong>. Each card = one grade.
                                        Select <strong>all subjects</strong> and <strong>all sections</strong> for that grade.
                                        Teaching in multiple grades? Add one card per grade.
                                        {Object.keys(gradeSubjects).length === 0 && <span className="text-orange-600 ml-2">⚠ No subjects configured — go to "Grade &amp; Subject Mapping" tab first.</span>}
                                      </div>

                                      {/* Grade cards */}
                                      <div className="space-y-3 mb-3">
                                        {editRows.map((row, ri) => {
                                          const availableSubjects = gradeSubjects[row.grade] || [];
                                          const availableSections = allSectionsFull.filter(s => s.grade === row.grade);
                                          return (
                                            <div key={ri} className="bg-white border-2 border-gray-200 rounded-xl p-4">
                                              {/* Card header */}
                                              <div className="flex items-center gap-2 mb-3">
                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-2.5 py-0.5">
                                                  {row.grade || `Grade ${ri + 1}`}
                                                </span>
                                                {row.subjects.length > 0 && (
                                                  <span className="text-xs text-gray-500">{row.subjects.length} subject{row.subjects.length > 1 ? "s" : ""}</span>
                                                )}
                                                {row.sections.length > 0 && (
                                                  <span className="text-xs text-gray-500">{row.sections.length} section{row.sections.length > 1 ? "s" : ""}</span>
                                                )}
                                                {editRows.length > 1 && (
                                                  <button onClick={() => removeEditRow(ri)} className="ml-auto text-xs text-red-400 hover:text-red-600 font-medium">✕ Remove</button>
                                                )}
                                              </div>

                                              {/* Grade dropdown */}
                                              <div className="mb-3">
                                                <label className="text-xs text-gray-500 font-semibold block mb-1">Grade</label>
                                                <select value={row.grade} onChange={e => updateEditRowGrade(ri, e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-xs bg-white w-40">
                                                  <option value="">— Select Grade —</option>
                                                  {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                              </div>

                                              {row.grade && (
                                                <>
                                                  {/* Subjects — multi-select chips */}
                                                  <div className="mb-3">
                                                    <label className="text-xs text-gray-500 font-semibold block mb-1.5">
                                                      Subjects taught in {row.grade}
                                                      <span className="ml-1.5 text-indigo-500 font-normal">
                                                        {row.subjects.length === 0 ? "(click to select)" : `(${row.subjects.length} selected)`}
                                                      </span>
                                                    </label>
                                                    {availableSubjects.length === 0 ? (
                                                      <p className="text-xs text-orange-500 italic">No subjects configured for {row.grade} — add them in the "Grade &amp; Subject Mapping" tab.</p>
                                                    ) : (
                                                      <div className="flex flex-wrap gap-1.5">
                                                        {availableSubjects.map(sub => (
                                                          <button key={sub} onClick={() => toggleSubjectInRow(ri, sub)}
                                                            className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-all ${row.subjects.includes(sub) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600"}`}>
                                                            {sub}
                                                          </button>
                                                        ))}
                                                      </div>
                                                    )}
                                                  </div>

                                                  {/* Sections — multi-select chips */}
                                                  <div>
                                                    <label className="text-xs text-gray-500 font-semibold block mb-1.5">
                                                      Sections in {row.grade}
                                                      <span className="ml-1.5 text-indigo-500 font-normal">
                                                        {row.sections.length === 0 ? "(click to select)" : `(${row.sections.length} selected)`}
                                                      </span>
                                                    </label>
                                                    {availableSections.length === 0 ? (
                                                      <p className="text-xs text-gray-400 italic">No sections found for {row.grade}.</p>
                                                    ) : (
                                                      <div className="flex flex-wrap gap-1.5">
                                                        {availableSections.map(s => (
                                                          <button key={s.name} onClick={() => toggleSection(ri, s.name)}
                                                            className={`px-2.5 py-1 text-xs rounded-full border font-medium transition-all ${row.sections.includes(s.name) ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-600 border-gray-300 hover:border-green-400 hover:text-green-600"}`}>
                                                            {s.name}
                                                          </button>
                                                        ))}
                                                      </div>
                                                    )}
                                                  </div>
                                                </>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>

                                      <button onClick={addEditRow} className="px-3 py-1.5 border border-dashed border-indigo-400 text-indigo-600 text-xs rounded-lg hover:bg-indigo-50 font-medium mb-5">
                                        + Add another grade
                                      </button>

                                      {/* Class Teacher — dedicated section */}
                                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                                        <h4 className="text-xs font-bold text-yellow-800 mb-1">👑 Class Teacher Role <span className="font-normal text-yellow-600">(optional)</span></h4>
                                        <p className="text-xs text-yellow-700 mb-3">Pick the ONE section this teacher is class teacher for.</p>
                                        <div className="flex gap-3 flex-wrap items-end">
                                          <div>
                                            <label className="text-xs text-gray-500 block mb-1">Grade</label>
                                            <select
                                              value={classTeacherGrade}
                                              onChange={e => { setClassTeacherGrade(e.target.value); setClassTeacherSection(""); }}
                                              className="border border-gray-300 rounded px-2 py-1.5 text-xs bg-white min-w-[140px]"
                                            >
                                              <option value="">— Not a class teacher —</option>
                                              {[...new Set(editRows.filter(r => r.grade).map(r => r.grade))].map(g => (
                                                <option key={g} value={g}>{g}</option>
                                              ))}
                                            </select>
                                          </div>
                                          {classTeacherGrade && (
                                            <div>
                                              <label className="text-xs text-gray-500 block mb-1">Section</label>
                                              <select
                                                value={classTeacherSection}
                                                onChange={e => setClassTeacherSection(e.target.value)}
                                                className="border border-gray-300 rounded px-2 py-1.5 text-xs bg-white min-w-[140px]"
                                              >
                                                <option value="">— Select Section —</option>
                                                {allSectionsFull.filter(s => s.grade === classTeacherGrade).map(s => (
                                                  <option key={s.name} value={s.name}>{s.name}</option>
                                                ))}
                                              </select>
                                            </div>
                                          )}
                                          {classTeacherGrade && classTeacherSection && (
                                            <span className="bg-yellow-200 text-yellow-800 px-3 py-1.5 rounded text-xs font-semibold">
                                              👑 {classTeacherGrade} — {classTeacherSection}
                                            </span>
                                          )}
                                          {classTeacherGrade && (
                                            <button onClick={() => { setClassTeacherGrade(""); setClassTeacherSection(""); }} className="text-xs text-gray-400 hover:text-red-500">
                                              Clear
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      <button onClick={saveAssignments} disabled={savingAssignments} className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50">
                                        {savingAssignments ? "Saving..." : `💾 Save Assignments for ${academicYear}`}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ────────────────── STAFF ACCOUNTS TAB ────────────────── */}
      {mainTab === "staff" && (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden mb-4">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-700">Staff Accounts — Principal, AHM & Admin</h2>
            <p className="text-xs text-gray-500 mt-0.5">These accounts have elevated access. Edit profiles here.</p>
          </div>
          {staffAccounts.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No staff accounts found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Role</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Phone</th>
                    <th className="px-3 py-2 text-center">Password</th>
                    <th className="px-3 py-2 text-left">Last Login</th>
                    <th className="px-3 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffAccounts.map((u, i) => (
                    <tr key={u.id} className={`border-b border-gray-100 ${i%2===0?"bg-white":"bg-gray-50"}`}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          {u.photo ? <img src={u.photo} alt="" className="w-7 h-7 rounded-full object-cover border border-gray-200 flex-shrink-0" /> : <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs flex-shrink-0 text-indigo-600 font-bold">{u.name?.[0]?.toUpperCase()}</div>}
                          <span className="font-medium text-gray-800">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${u.role==="principal"?"bg-purple-100 text-purple-700":u.role==="ahm"?"bg-teal-100 text-teal-700":"bg-blue-100 text-blue-700"}`}>
                          {u.role==="principal"?"Principal":u.role==="ahm"?"AHM":"Admin"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">{u.email||"—"}</td>
                      <td className="px-3 py-2.5 text-gray-500">{u.phone||"—"}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={() => setShowPassword(p => ({ ...p, [u.id]: !p[u.id] }))} className="text-gray-400 hover:text-indigo-600 text-xs">{showPassword[u.id]?"🔓":"🔒"}</button>
                        {showPassword[u.id] && <span className="block font-mono text-xs text-indigo-600 mt-0.5">{u.password||"—"}</span>}
                      </td>
                      <td className="px-3 py-2.5"><span className={u.last_login_at?"text-green-600":"text-gray-300 italic"}>{formatDate(u.last_login_at)}</span></td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => openStaffEdit(u)} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-xs font-medium">✏️ Edit</button>
                          <button onClick={() => { setResetPwdUser(u); setNewPassword(""); }} className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 text-xs font-medium">🔑</button>
                          <button onClick={() => copyCredentials(u)} className="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-xs font-medium">📋</button>
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

      {/* ────────────────── INACTIVE TAB ────────────────── */}
      {mainTab === "inactive" && (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden mb-4">
          <div className="px-4 py-3 bg-red-50 border-b border-red-100">
            <h2 className="text-sm font-bold text-red-700">Deactivated ({inactiveUsers.length})</h2>
            <p className="text-xs text-red-500 mt-0.5">All data preserved — reactivate to restore access</p>
          </div>
          {inactiveUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No deactivated users</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Role</th>
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
                          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500 font-bold">{u.name?.[0]?.toUpperCase()}</div>
                          <span className="font-medium text-gray-600">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5"><span className="text-gray-500 capitalize">{u.role}</span></td>
                      <td className="px-3 py-2.5 text-gray-400">{u.email||"—"}</td>
                      <td className="px-3 py-2.5 text-gray-500">{u.appraisal_qualification||"—"}</td>
                      <td className="px-3 py-2.5 text-red-500">{formatDate(u.deactivated_at)}</td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex gap-1 justify-center flex-wrap">
                          <button onClick={() => openPortfolio(u)} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-xs font-medium">📋 Portfolio</button>
                          <button onClick={() => reactivateUser(u.id, u.name)} className="px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-xs font-medium">✅ Reactivate</button>
                          <button onClick={() => permanentDelete(u.id, u.name)} className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs font-medium">🗑️ Delete</button>
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

      {/* ────────────────── GRADE & SUBJECT MAPPING TAB ────────────────── */}
      {mainTab === "grade-subjects" && (
        <div className="space-y-3">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-2">
            <h3 className="text-sm font-bold text-indigo-800 mb-1">Grade & Subject Mapping</h3>
            <p className="text-xs text-indigo-600">Configure which subjects are taught in each grade. These subjects will appear as dropdown options when editing a teacher's assignments. Changes here affect all future teacher assignment edits.</p>
          </div>
          {CLASSES.map(grade => {
            const subjects = gradeSubjects[grade] || [];
            const subjectItems = gradeSubjectsList.filter(g => g.grade === grade);
            return (
              <div key={grade} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-700">{grade}</h4>
                  <span className="text-xs text-gray-400">{subjects.length} subject{subjects.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3 min-h-[28px]">
                  {subjects.length === 0 ? (
                    <span className="text-xs text-gray-400 italic">No subjects configured for {grade}</span>
                  ) : subjectItems.map(item => (
                    <span key={item.id} className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      {item.subject}
                      <button onClick={() => removeGradeSubject(item.id)} className="text-indigo-400 hover:text-red-500 ml-0.5 font-bold leading-none">✕</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newSubjectInputs[grade] || ""}
                    onChange={e => setNewSubjectInputs(p => ({ ...p, [grade]: e.target.value }))}
                    onKeyDown={e => { if (e.key === "Enter") addGradeSubject(grade); }}
                    placeholder={`Add subject for ${grade}...`}
                    className="border border-gray-300 rounded px-3 py-1.5 text-xs flex-1 max-w-xs focus:border-indigo-400 outline-none"
                  />
                  <button onClick={() => addGradeSubject(grade)} className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 font-medium">
                    + Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── RESET PASSWORD MODAL ── */}
      {resetPwdUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            <h3 className="text-sm font-bold text-gray-800 mb-1">🔑 Reset Password</h3>
            <p className="text-xs text-gray-500 mb-4">{resetPwdUser.name}</p>
            <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" className="border border-gray-300 rounded px-3 py-2 text-sm w-full mb-3 font-mono" />
            <div className="flex gap-2">
              <button onClick={doResetPassword} className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-semibold">Reset</button>
              <button onClick={() => { setResetPwdUser(null); setNewPassword(""); }} className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY MODAL ── */}
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

      {/* ── STAFF EDIT MODAL ── */}
      {editStaffUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-800">✏️ Edit — {editStaffUser.name}</h2>
              <button onClick={() => setEditStaffUser(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:"Name", key:"name" },
                  { label:"Email", key:"email" },
                  { label:"New Password (optional)", key:"password" },
                  { label:"Phone", key:"phone" },
                  { label:"Experience (yrs)", key:"experience" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                    <input value={editStaffForm[f.key]||""} onChange={e => setEditStaffForm((p: any) => ({ ...p, [f.key]: e.target.value }))} className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full" />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Role</label>
                  <select value={editStaffForm.role||"admin"} onChange={e => setEditStaffForm((p: any) => ({ ...p, role: e.target.value }))} className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full">
                    <option value="teacher">Teacher</option>
                    <option value="ahm">AHM</option>
                    <option value="admin">Admin</option>
                    <option value="principal">Principal</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Qualification</label>
                  <select value={editStaffForm.appraisal_qualification||""} onChange={e => setEditStaffForm((p: any) => ({ ...p, appraisal_qualification: e.target.value }))} className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full">
                    <option value="">-- Select --</option>
                    {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button onClick={saveStaffEdit} className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 font-semibold">💾 Save</button>
                <button onClick={() => setEditStaffUser(null)} className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PORTFOLIO MODAL ── */}
      {portfolioUser && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">{portfolioUser.name?.[0]?.toUpperCase()}</div>
                <div>
                  <h2 className="text-white font-bold text-base">{portfolioUser.name}</h2>
                  <p className="text-indigo-200 text-xs">Teacher Portfolio</p>
                </div>
              </div>
              <button onClick={() => { setPortfolioUser(null); setPortfolioData(null); }} className="text-white/70 hover:text-white text-xl font-light">✕</button>
            </div>
            {portfolioLoading && <div className="p-12 text-center text-gray-400 text-sm">Loading portfolio...</div>}
            {!portfolioLoading && !portfolioData && <div className="p-12 text-center text-gray-400 text-sm">Failed to load portfolio data.</div>}
            {!portfolioLoading && portfolioData && (
              <div className="p-5 space-y-5">
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                  <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wide mb-3">Profile</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div><span className="text-gray-400">Email</span><p className="font-medium text-gray-700">{portfolioData.profile.email||"—"}</p></div>
                    <div><span className="text-gray-400">Qualification</span><p className="font-medium text-gray-700">{portfolioData.profile.appraisal_qualification||"—"}</p></div>
                    <div><span className="text-gray-400">Experience</span><p className="font-medium text-gray-700">{portfolioData.profile.experience ? portfolioData.profile.experience+" yrs" : "—"}</p></div>
                    <div><span className="text-gray-400">Subjects</span><p className="font-medium text-gray-700">{(portfolioData.profile.subjects||[]).join(", ")||"—"}</p></div>
                    <div><span className="text-gray-400">Phone</span><p className="font-medium text-gray-700">{portfolioData.profile.phone||"—"}</p></div>
                    <div><span className="text-gray-400">Status</span><p className="font-medium text-red-600">Deactivated</p></div>
                  </div>
                </div>
                {portfolioData.appraisal_history?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Appraisal History</h3>
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50"><tr className="text-gray-500 border-b border-gray-200">
                          {["Year","Overall %","Exam","Skills","Behaviour","Classroom","Parents"].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {portfolioData.appraisal_history.map((a: any) => (
                            <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="px-3 py-2 font-semibold text-indigo-700">{a.academic_year}</td>
                              <td className="px-3 py-2"><span className={`font-bold ${+a.overall_percentage>=75?"text-green-600":+a.overall_percentage>=50?"text-amber-600":"text-red-500"}`}>{(+a.overall_percentage).toFixed(1)}%</span></td>
                              <td className="px-3 py-2 text-gray-600">{(+a.exam_score*100).toFixed(0)}%</td>
                              <td className="px-3 py-2 text-gray-600">{(+a.skills_score*100).toFixed(0)}%</td>
                              <td className="px-3 py-2 text-gray-600">{(+a.behaviour_score*100).toFixed(0)}%</td>
                              <td className="px-3 py-2 text-gray-600">{(+a.classroom_score*100).toFixed(0)}%</td>
                              <td className="px-3 py-2 text-gray-600">{(+a.parents_feedback_score*100).toFixed(0)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {portfolioData.observation_history?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Observation History</h3>
                    <div className="space-y-2">
                      {portfolioData.observation_history.map((y: any) => (
                        <div key={y.academic_year} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-indigo-700">{y.academic_year}</span>
                            <div className="flex gap-3 text-xs text-gray-500">
                              <span>{y.count} observation{y.count!==1?"s":""}</span>
                              <span className={`font-bold ${y.avg_percentage>=75?"text-green-600":y.avg_percentage>=50?"text-amber-600":"text-red-500"}`}>Avg {y.avg_percentage}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
