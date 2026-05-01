import { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'https://cbas-backend-production.up.railway.app';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import UserManagementPage from './pages/UserManagementPage';
import StudentManagementPage from './pages/StudentManagementPage';
import SectionManagementPage from './pages/SectionManagementPage';
import AppraisalPage from './pages/AppraisalPage';
import BaselinePage from './pages/BaselinePage';
import CompetencyManagementPage from './pages/CompetencyManagementPage';
import ActivitiesPage from './pages/ActivitiesPage';
import ClassObservationPage from "./pages/ClassObservationPage";
import PASAPage from "./pages/PASAPage";
import TeacherDashboardPage from "./pages/TeacherDashboardPage";

const ACADEMIC_YEARS = Array.from({ length: 5 }, (_, i) => {
  const y = 2025 + i;
  return `${y}-${String(y + 1).slice(2)}`;
});

const CLASS_TABS = (isClassTeacher: boolean) => [
  { id: 'students',       label: 'My Students',        show: true },
  { id: 'classview',      label: 'My Class',           show: isClassTeacher },
  { id: 'pasa',           label: 'PA/SA Marks',        show: true },
  { id: 'baseline_entry', label: 'Baseline Entry',     show: isClassTeacher },
  { id: 'baseline_dash',  label: 'Baseline Dashboard', show: true },
  { id: 'activities',     label: 'Activities',         show: true },
  { id: 'ai_tools',       label: 'AI Tools',           show: true },
  { id: 'homework',       label: 'AI Homework',        show: true },
  { id: 'alerts',         label: 'Alerts',             show: true },
  { id: 'promotion',      label: 'Promotion',          show: isClassTeacher },
  { id: 'portfolio',      label: 'Student Portfolio',  show: true },
];

const SELF_TABS = [
  { id: 'profile',       label: 'My Profile',         show: true },
  { id: 'self_baseline', label: 'My Baseline',        show: true },
  { id: 'appraisal',     label: 'My Appraisal',       show: true },
  { id: 'observations',  label: 'My Observations',    show: true },
  { id: 'self_ai',       label: 'AI Learning',        show: true },
  { id: 'learning_res',  label: 'Learning Resources', show: true },
];

const SELF_TAB_IDS = new Set(SELF_TABS.map(t => t.id));

function TeacherLayout({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<string>('students');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [mappings, setMappings] = useState<any>(null);

  useEffect(() => {
    if (!user?.id) return;
    axios.get(`${API}/mappings/teacher/${user.id}/dashboard?academic_year=${academicYear}`)
      .then(r => setMappings(r.data))
      .catch(() => {});
  }, [academicYear, user?.id]);

  const isClassTeacher = !!(mappings?.is_class_teacher);
  const activeGroup: 'class' | 'self' = SELF_TAB_IDS.has(activeTab) ? 'self' : 'class';
  const classTabs = CLASS_TABS(isClassTeacher);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-indigo-900 flex flex-col flex-shrink-0">
        {/* Branding */}
        <div className="px-4 py-5 border-b border-indigo-700">
          <h1 className="text-white text-sm font-bold leading-tight">Wisdom Techno School</h1>
          <p className="text-indigo-300 text-xs mt-0.5">Teacher Portal</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          <p className="text-indigo-400 text-xs font-semibold uppercase tracking-wider px-2 pt-1 pb-1.5">
            Class Management
          </p>
          {classTabs.filter(t => t.show).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === t.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}

          <p className="text-indigo-400 text-xs font-semibold uppercase tracking-wider px-2 pt-4 pb-1.5">
            Self Management
          </p>
          {SELF_TABS.filter(t => t.show).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === t.id
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* User card */}
        <div className="border-t border-indigo-700 p-4">
          <div className="flex items-center gap-3 mb-3">
            {user?.photo ? (
              <img src={user.photo} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-indigo-400" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
              <p className="text-indigo-300 text-xs capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-indigo-700 hover:bg-red-600 text-white text-xs py-2 rounded-lg transition-all font-medium"
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <TeacherDashboardPage
          user={user}
          mappings={mappings}
          activeTab={activeTab}
          activeGroup={activeGroup}
          academicYear={academicYear}
          setAcademicYear={setAcademicYear}
        />
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("cbas_user");
    if (!stored) { setChecking(false); return; }
    let parsed: any = null;
    try { parsed = JSON.parse(stored); } catch { localStorage.removeItem("cbas_user"); setChecking(false); return; }
    setUser(parsed);

    // Refresh from DB so section re-assignments are immediately visible without re-login
    if (parsed?.email && parsed.role !== 'principal') {
      axios.get(`${API}/users/me?email=${encodeURIComponent(parsed.email)}`)
        .then(res => {
          const fresh = res.data;
          const merged = { ...parsed, ...fresh };
          localStorage.setItem("cbas_user", JSON.stringify(merged));
          setUser(merged);
        })
        .catch(() => { /* silently keep cached version on network error */ })
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem("cbas_user");
    setUser(null);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-indigo-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Teachers get their own dedicated dashboard with sidebar navigation
  if (user.role === "teacher") {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<TeacherLayout user={user} onLogout={handleLogout} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // Principal / Admin get the full admin app
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout user={user} onLogout={handleLogout} />}>
          <Route index element={<UserManagementPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="students" element={<StudentManagementPage />} />
          <Route path="sections" element={<SectionManagementPage />} />
          <Route path="appraisal" element={<AppraisalPage />} />
          <Route path="baseline" element={<BaselinePage />} />
          <Route path="competencies" element={<CompetencyManagementPage />} />
          <Route path="activities" element={<ActivitiesPage />} />
          <Route path="observation" element={<ClassObservationPage />} />
          <Route path="pasa" element={<PASAPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

