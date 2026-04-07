import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/users',         label: 'User Management',      icon: '👥' },
  { path: '/students',      label: 'Student Management',   icon: '🎓' },
  { path: '/appraisal',     label: 'Teachers Appraisal',   icon: '📋' },
  { path: '/baseline',      label: 'Baseline Entry',       icon: '📈' },
  { path: '/competencies',  label: 'Competency Registry',  icon: '🗂️' },
  { path: '/activities',    label: 'Activities & Marks',   icon: '🎯' },
  { path: '/pasa',          label: 'PA/SA Marks',          icon: '📝' },
  { path: '/observation',   label: 'Class Observation',    icon: '👁' },
  { path: '/student-parent',label: 'Student / Parent',     icon: '👨‍👩‍👧' },
  { path: '/sections',      label: 'Section Management',   icon: '🏫' },  
];

interface MainLayoutProps {
  user: any;
  onLogout: () => void;
}

export default function MainLayout({ user, onLogout }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const NavItems = () => (
    <>
      {NAV_ITEMS.map(item => (
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

  return (
    <div className="flex h-screen bg-gray-100">

      {/* ── DESKTOP SIDEBAR ── */}
      <div className="hidden md:flex w-64 bg-indigo-900 flex-col flex-shrink-0">
        <div className="px-4 py-5 border-b border-indigo-700">
          <h1 className="text-white text-sm font-bold leading-tight">Wisdom Techno School</h1>
          <p className="text-indigo-300 text-xs mt-0.5">CBAS Portal</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          <NavItems />
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
        <div className="px-4 py-5 border-b border-indigo-700 flex items-center justify-between">
          <div>
            <h1 className="text-white text-sm font-bold leading-tight">Wisdom Techno School</h1>
            <p className="text-indigo-300 text-xs mt-0.5">CBAS Portal</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-indigo-300 hover:text-white text-xl p-1">✕</button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          <NavItems />
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

