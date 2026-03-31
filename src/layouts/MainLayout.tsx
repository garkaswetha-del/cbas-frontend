import { Outlet, NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/users', label: 'User Management', icon: '👥' },
  { path: '/students', label: 'Student Management', icon: '🎓' },
  { path: '/appraisal', label: 'M4: Teachers Appraisal', icon: '📋' },
  { path: '/baseline', label: 'M1: Baseline Entry', icon: '📈' },
  { path: '/competencies', label: 'M2: Competency Registry', icon: '🗂️' },
  { path: '/activities', label: 'M2: Activities & Marks', icon: '🎯' },
  { path: '/pasa', label: 'M3: PA/SA Marks', icon: '📝' },
  { path: '/observation', label: 'M5: Class Observation', icon: '👁' },
  { path: '/student-parent', label: 'M7: Student / Parent', icon: '👨‍👩‍👧' },
];

interface MainLayoutProps {
  user: any;
  onLogout: () => void;
}

export default function MainLayout({ user, onLogout }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-indigo-900 flex flex-col flex-shrink-0">
        {/* Logo area */}
        <div className="px-4 py-5 border-b border-indigo-700">
          <h1 className="text-white text-sm font-bold leading-tight">Wisdom Techno School</h1>
          <p className="text-indigo-300 text-xs mt-0.5">CBAS Portal</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
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
        </nav>

        {/* User info + logout */}
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
        <Outlet />
      </div>
    </div>
  );
}
