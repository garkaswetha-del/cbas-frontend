import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { path: '/users', label: 'User Management', icon: '👥' },
  { path: '/students', label: 'Student Management', icon: '🎓' },
  { path: '/appraisal', label: 'M4: Teachers Appraisal', icon: '📋' },
  { path: '/baseline', label: 'M1: Baseline Entry', icon: '📈' },
  { path: '/competencies', label: 'M2: Competency Registry', icon: '🗂️' },
  { path: '/activities', label: 'M2: Activities & Marks', icon: '🎯' },
  { path: '/student-parent', label: 'M7: Student / Parent', icon: '👨‍👩‍👧' },
  { path: '/observation', label: 'M5: Class Observation', icon: '👁' },
  { path: "/pasa", label: "M3: PA/SA Marks" },
];

export default function MainLayout() {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-56 bg-indigo-900 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-indigo-700">
          <h1 className="text-white font-bold text-lg">CBAS</h1>
          <p className="text-indigo-300 text-xs mt-0.5">School Management</p>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg mb-1 text-sm transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Bottom user info */}
        <div className="px-4 py-3 border-t border-indigo-700">
          <p className="text-indigo-300 text-xs">Logged in as</p>
          <p className="text-white text-sm font-semibold">Principal</p>
          <p className="text-indigo-400 text-xs mt-0.5">2025-26</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <h2 className="text-gray-700 font-semibold text-base">
            Competency Based Assessment System
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Academic Year: 2025-26
            </span>
            <button className="text-xs text-red-500 hover:text-red-700">
              Logout
            </button>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}