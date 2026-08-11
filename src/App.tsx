import { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { currentAcademicYear } from './utils/academicYear';

import MainLayout from './layouts/MainLayout';
import { getAPI, getSchoolName } from './utils/api';
const API = getAPI();
import LoginPage from './pages/LoginPage';
import UserManagementPage from './pages/UserManagementPage';
import StudentManagementPage from './pages/StudentManagementPage';
import AppraisalPage from './pages/AppraisalPage';
import BaselinePage from './pages/BaselinePage';
import CompetencyManagementPage from './pages/CompetencyManagementPage';
import ActivitiesPage from './pages/ActivitiesPage';
import ClassObservationPage from "./pages/ClassObservationPage";
import PASAPage from "./pages/PASAPage";
import TeacherDashboardPage from "./pages/TeacherDashboardPage";
import MemosPage from "./pages/MemosPage";
import SuperDashboardPage from "./pages/SuperDashboardPage";
import AuditLogPage from "./pages/AuditLogPage";
import SubstitutionPage from "./pages/SubstitutionPage";
import AcademicCalendarPage from "./pages/AcademicCalendarPage";
import SOWPage from "./pages/SOWPage";

const CLASS_TABS = (isClassTeacher: boolean) => [
  { id: 'students',       label: 'My Students',        show: true },
  { id: 'pasa',           label: 'PA/SA Marks',        show: true },
  { id: 'activities',     label: 'Activities',         show: true },
  { id: 'ai_tools',       label: 'AI Tools',           show: true },
  { id: 'alerts',         label: 'Alerts',             show: true },
  { id: 'promotion',      label: 'Promotion',          show: isClassTeacher },
  { id: 'portfolio',      label: 'Student Portfolio',  show: true },
];

const SELF_TABS = [
  { id: 'profile',       label: 'My Profile',         show: true },
  { id: 'self_baseline', label: 'My Baseline',        show: true },
  { id: 'appraisal',     label: 'My Appraisal',       show: true },
  { id: 'observations',  label: 'My Observations',    show: true },
  { id: 'self_ai',       label: 'My AI',              show: true },
  { id: 'memos',         label: 'Memos',              show: true },
  { id: 'calendar',     label: 'Academic Calendar',  show: true },
  { id: 'sow',          label: 'Scheme of Work',     show: true },
];

const SELF_TAB_IDS = new Set(SELF_TABS.map(t => t.id));

const AHM_TOOL_TABS = [
  { id: 'ahm_baseline',     label: 'Baseline Entry' },
  { id: 'ahm_competencies', label: 'Competency Registry' },
  { id: 'ahm_activities',   label: 'Activities & Marks' },
  { id: 'ahm_pasa',         label: 'PA/SA' },
  { id: 'ahm_observation',  label: 'Class Observation' },
  { id: 'ahm_substitution', label: 'Substitution' },
  { id: 'ahm_calendar',     label: 'Academic Calendar' },
  { id: 'ahm_sow',          label: 'Scheme of Work' },
];
const AHM_TOOL_TAB_IDS = new Set(AHM_TOOL_TABS.map(t => t.id));

function TeacherLayout({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<string>('students');
  const [academicYear, setAcademicYear] = useState(currentAcademicYear);
  const [mappings, setMappings] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    axios.get(`${API}/mappings/teacher/${user.id}/dashboard?academic_year=${academicYear}`)
      .then(r => setMappings(r.data))
      .catch(() => {});
  }, [academicYear, user?.id]);

  const isClassTeacher = !!(mappings?.is_class_teacher);
  const activeGroup: 'class' | 'self' = SELF_TAB_IDS.has(activeTab) ? 'self' : 'class';
  const classTabs = CLASS_TABS(isClassTeacher);

  const SidebarContent = () => (
    <>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <p className="text-indigo-400 text-xs font-semibold uppercase tracking-wider px-2 pt-1 pb-1.5">
          Class Management
        </p>
        {classTabs.filter(t => t.show).map(t => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}
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
            onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}
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
    </>
  );

  return (
    <div className="flex h-screen bg-gray-100">

      {/* ── DESKTOP SIDEBAR ── */}
      <div className="hidden md:flex w-64 bg-indigo-900 flex-col flex-shrink-0">
        <div className="px-4 py-5 border-b border-indigo-700">
          <h1 className="text-white text-sm font-bold leading-tight">{getSchoolName()}</h1>
          <p className="text-indigo-300 text-xs mt-0.5">Teacher Portal</p>
        </div>
        <SidebarContent />
      </div>

      {/* ── MOBILE OVERLAY ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── MOBILE DRAWER ── */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-indigo-900 z-50 flex flex-col transform transition-transform duration-300 md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-4 py-4 border-b border-indigo-700 flex items-center justify-between">
          <div>
            <h1 className="text-white text-sm font-bold leading-tight">{getSchoolName()}</h1>
            <p className="text-indigo-300 text-xs mt-0.5">Teacher Portal</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-indigo-300 hover:text-white text-xl p-1">✕</button>
        </div>
        <SidebarContent />
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between bg-indigo-900 px-4 py-3 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-white p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="text-center">
            <p className="text-white text-xs font-bold">{getSchoolName()}</p>
            <p className="text-indigo-300 text-xs">Teacher Portal</p>
          </div>
          <button onClick={onLogout} className="text-indigo-300 hover:text-red-400 text-xs p-1">
            🚪
          </button>
        </div>

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
    </div>
  );
}

function AHMLayout({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<string>('students');
  const [academicYear, setAcademicYear] = useState(currentAcademicYear);
  const [mappings, setMappings] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    axios.get(`${API}/mappings/teacher/${user.id}/dashboard?academic_year=${academicYear}`)
      .then(r => setMappings(r.data))
      .catch(() => {});
  }, [academicYear, user?.id]);

  const isClassTeacher = !!(mappings?.is_class_teacher);
  const AHM_SELF_TABS = SELF_TABS.filter(t => t.id !== 'appraisal');
  const AHM_SELF_TAB_IDS = new Set(AHM_SELF_TABS.map(t => t.id));
  const activeGroup: 'class' | 'self' = AHM_SELF_TAB_IDS.has(activeTab) ? 'self' : 'class';
  const classTabs = CLASS_TABS(isClassTeacher);

  const renderContent = () => {
    if (activeTab === 'ahm_baseline')     return <BaselinePage />;
    if (activeTab === 'ahm_competencies') return <CompetencyManagementPage />;
    if (activeTab === 'ahm_activities')   return <ActivitiesPage />;
    if (activeTab === 'ahm_pasa')         return <PASAPage />;
    if (activeTab === 'ahm_observation')  return <ClassObservationPage />;
    if (activeTab === 'ahm_substitution') return <SubstitutionPage />;
    if (activeTab === 'ahm_calendar')     return <AcademicCalendarPage />;
    if (activeTab === 'ahm_sow')          return <SOWPage user={user} />;
    return (
      <TeacherDashboardPage
        user={user}
        mappings={mappings}
        activeTab={activeTab}
        activeGroup={activeGroup}
        academicYear={academicYear}
        setAcademicYear={setAcademicYear}
      />
    );
  };

  const SidebarContent = () => (
    <>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <p className="text-indigo-400 text-xs font-semibold uppercase tracking-wider px-2 pt-1 pb-1.5">
          Class Management
        </p>
        {classTabs.filter(t => t.show).map(t => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}
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
        {AHM_SELF_TABS.filter(t => t.show).map(t => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}
            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === t.id
                ? 'bg-purple-600 text-white shadow'
                : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
        <p className="text-indigo-400 text-xs font-semibold uppercase tracking-wider px-2 pt-4 pb-1.5">
          AHM Tools
        </p>
        {AHM_TOOL_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}
            className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              AHM_TOOL_TAB_IDS.has(activeTab) && activeTab === t.id
                ? 'bg-teal-600 text-white shadow'
                : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>
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
    </>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="hidden md:flex w-64 bg-indigo-900 flex-col flex-shrink-0">
        <div className="px-4 py-5 border-b border-indigo-700">
          <h1 className="text-white text-sm font-bold leading-tight">{getSchoolName()}</h1>
          <p className="text-indigo-300 text-xs mt-0.5">AHM Portal</p>
        </div>
        <SidebarContent />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed top-0 left-0 h-full w-72 bg-indigo-900 z-50 flex flex-col transform transition-transform duration-300 md:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-4 py-4 border-b border-indigo-700 flex items-center justify-between">
          <div>
            <h1 className="text-white text-sm font-bold leading-tight">{getSchoolName()}</h1>
            <p className="text-indigo-300 text-xs mt-0.5">AHM Portal</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-indigo-300 hover:text-white text-xl p-1">✕</button>
        </div>
        <SidebarContent />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden flex items-center justify-between bg-indigo-900 px-4 py-3 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-white p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="text-center">
            <p className="text-white text-xs font-bold">{getSchoolName()}</p>
            <p className="text-indigo-300 text-xs">AHM Portal</p>
          </div>
          <button onClick={onLogout} className="text-indigo-300 hover:text-red-400 text-xs p-1">🚪</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
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
    const stored = localStorage.getItem("cbas_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        axios.post(`${API}/users/logout`, { user_name: u.name, user_id: u.id, user_role: u.role }).catch(() => {});
      } catch {}
    }
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

  // AHM: dual role — teacher tabs + AHM admin tools; no appraisal
  if (user.role === "ahm") {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<AHMLayout user={user} onLogout={handleLogout} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // Office: user management, student management, calendar with full create/edit access
  if (user.role === "office") {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout user={user} onLogout={handleLogout} officeOnly />}>
            <Route index element={<Navigate to="/users" replace />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="students" element={<StudentManagementPage />} />
            <Route path="calendar" element={<AcademicCalendarPage />} />
            <Route path="*" element={<Navigate to="/users" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    );
  }

  // Principal / Admin get the full admin app
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout user={user} onLogout={handleLogout} />}>
          <Route index element={<Navigate to="/super-dashboard" replace />} />
          <Route path="super-dashboard" element={<SuperDashboardPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="students" element={<StudentManagementPage />} />
          <Route path="appraisal" element={<AppraisalPage />} />
          <Route path="baseline" element={<BaselinePage />} />
          <Route path="competencies" element={<CompetencyManagementPage />} />
          <Route path="activities" element={<ActivitiesPage />} />
          <Route path="observation" element={<ClassObservationPage />} />
          <Route path="pasa" element={<PASAPage />} />
          <Route path="memos" element={<MemosPage />} />
          <Route path="audit-log" element={<AuditLogPage />} />
          <Route path="substitution" element={<SubstitutionPage />} />
          <Route path="calendar" element={<AcademicCalendarPage />} />
          <Route path="sow" element={<SOWPage user={user} />} />
          <Route path="*" element={<Navigate to="/super-dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

