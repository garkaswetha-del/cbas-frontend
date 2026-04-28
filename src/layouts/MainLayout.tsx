import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';

const ADMINISTRATIVE_NAV = [
  { path: '/users',    label: 'User Management',   icon: '👥' },
  { path: '/students', label: 'Student Management', icon: '🎓' },
  { path: '/sections', label: 'Section Management', icon: '🏫' },
  { path: '/appraisal',label: 'Teachers Appraisal', icon: '📋' },
];

const ACADEMIC_NAV = [
  { path: '/baseline',     label: 'Baseline Entry',      icon: '📈' },
  { path: '/competencies', label: 'Competency Registry',  icon: '🗂️' },
  { path: '/activities',   label: 'Activities & Marks',   icon: '🎯' },
  { path: '/pasa',         label: 'PA/SA Marks',          icon: '📝' },
  { path: '/observation',  label: 'Class Observation',    icon: '👁' },
];

const ADMIN_PATHS = ADMINISTRATIVE_NAV.map(n => n.path);
const ACADEMIC_PATHS = ACADEMIC_NAV.map(n => n.path);

interface MainLayoutProps {
  user: any;
  onLogout: () => void;
}

export default function MainLayout({ user, onLogout }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const detectTab = (pathname: string) =>
    ACADEMIC_PATHS.some(p => pathname.startsWith(p)) ? 'academic' : 'administrative';

  const [navTab, setNavTab] = useState<'administrative' | 'academic'>(() => detectTab(location.pathname));

  useEffect(() => {
    setNavTab(detectTab(location.pathname));
  }, [location.pathname]);

  const currentNav = navTab === 'administrative' ? ADMINISTRATIVE_NAV : ACADEMIC_NAV;

  const TabSwitcher = () => (
    <div className="flex mx-3 mb-2 rounded-lg overflow-hidden border border-indigo-700">
      <button
        onClick={() => setNavTab('administrative')}
        className={`flex-1 py-1.5 text-xs font-semibold transition-all ${
          navTab === 'administrative' ? 'bg-indigo-600 text-white' : 'text-indigo-400 hover:text-white hover:bg-indigo-800'
        }`}
      >
        Administrative
      </button>
      <button
        onClick={() => setNavTab('academic')}
        className={`flex-1 py-1.5 text-xs font-semibold transition-all ${
          navTab === 'academic' ? 'bg-indigo-600 text-white' : 'text-indigo-400 hover:text-white hover:bg-indigo-800'
        }`}
      >
        Academic
      </button>
    </div>
  );

  const NavItems = () => (
    <>
      {currentNav.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
              isActive
                ? 'bg-indigo-700 text-white font-semibold border-r-4 border-yellow-400'
                : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
            }`
          }
        >
          <span className="text-base">{item.icon}</span>
          <span className="leading-tight">{item.label}</span>
        </NavLink>
      ))}
    </>
  );

  const UserFooter = () => (
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
  );

  return (
    <div className="flex h-screen bg-gray-100">

      {/* ── DESKTOP SIDEBAR ── */}
      <div className="hidden md:flex w-64 bg-indigo-900 flex-col flex-shrink-0">
        <div className="px-4 py-4 border-b border-indigo-700">
          <h1 className="text-white text-sm font-bold leading-tight">Wisdom Techno School</h1>
          <p className="text-indigo-300 text-xs mt-0.5">CBAS Portal</p>
        </div>
        <div className="pt-3 pb-1">
          <TabSwitcher />
        </div>
        <nav className="flex-1 overflow-y-auto">
          <NavItems />
        </nav>
        <UserFooter />
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
            <h1 className="text-white text-sm font-bold leading-tight">Wisdom Techno School</h1>
            <p className="text-indigo-300 text-xs mt-0.5">CBAS Portal</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-indigo-300 hover:text-white text-xl p-1">✕</button>
        </div>
        <div className="pt-3 pb-1">
          <TabSwitcher />
        </div>
        <nav className="flex-1 overflow-y-auto">
          <NavItems />
        </nav>
        <UserFooter />
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
            <p className="text-white text-xs font-bold">Wisdom Techno School</p>
            <p className="text-indigo-300 text-xs">CBAS Portal</p>
          </div>
          <button onClick={onLogout} className="text-indigo-300 hover:text-red-400 text-xs p-1">
            🚪
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
