export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome to CBAS</h1>
      <p className="text-gray-500 mb-6">Competency Based Assessment System — 2025-26</p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-indigo-500">
          <p className="text-xs text-gray-500">Total Students</p>
          <p className="text-2xl font-bold text-indigo-700 mt-1">1500</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500">
          <p className="text-xs text-gray-500">Total Teachers</p>
          <p className="text-2xl font-bold text-green-700 mt-1">--</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-yellow-500">
          <p className="text-xs text-gray-500">Appraisals Done</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">--</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-purple-500">
          <p className="text-xs text-gray-500">Academic Year</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">2025-26</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Module Status</h2>
          <div className="space-y-2">
            {[
              { label: 'M4: Teachers Appraisal', status: 'Ready', color: 'green' },
              { label: 'M1: Baseline Assessment', status: 'Coming Mar 18', color: 'yellow' },
              { label: 'M2: Activities Assessment', status: 'Coming Mar 19', color: 'yellow' },
              { label: 'M3: PA / SA Marks', status: 'Coming Mar 23', color: 'yellow' },
              { label: 'M7: Student / Parent', status: 'Coming Mar 24', color: 'yellow' },
              { label: 'M5: Class Observation', status: 'Coming Mar 25', color: 'yellow' },
              { label: 'M6: Super Dashboard', status: 'Coming Mar 26', color: 'yellow' },
            ].map((m) => (
              <div key={m.label} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{m.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  m.color === 'green'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Links</h2>
          <div className="space-y-2">
            <a href="/appraisal" className="block px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm hover:bg-indigo-100">
              → Go to Teachers Appraisal
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}