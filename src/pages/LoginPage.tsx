import { useState } from "react";
import axios from "axios";
import { SCHOOLS, type School } from "../config/schools";
import { getAPI } from "../utils/api";

const LOGO = "data:image/jpeg;base64,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";

export default function LoginPage({ onLogin }: { onLogin: (user: any) => void }) {
  const storedId = localStorage.getItem('cbas_school_id');
  const storedSchool = SCHOOLS.find(s => s.id === storedId) ?? null;

  const [selectedSchool, setSelectedSchool] = useState<School | null>(storedSchool);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const selectSchool = (school: School) => {
    localStorage.setItem('cbas_school_id', school.id);
    setSelectedSchool(school);
    setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please enter email and password"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${getAPI()}/users/login`, { email, password });
      if (res.data.success) {
        localStorage.setItem("cbas_user", JSON.stringify(res.data.user));
        onLogin(res.data.user);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Invalid email or password");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-800 to-blue-700 px-8 py-8 text-center">
            <img src={LOGO} alt="Wisdom School" className="h-24 mx-auto mb-1 object-contain" />
            {selectedSchool ? (
              <p className="text-white text-sm font-bold tracking-[0.3em] uppercase mb-2">{selectedSchool.location}</p>
            ) : (
              <p className="text-white text-sm font-bold tracking-[0.3em] uppercase mb-2">Select Campus</p>
            )}
            <p className="text-blue-200 text-xs font-semibold tracking-widest uppercase mt-1">Competence Based Assessment System</p>
          </div>

          <div className="px-8 py-8">
            {!selectedSchool ? (
              /* Step 1 — School selector */
              <div>
                <h2 className="text-gray-700 text-base font-semibold mb-6 text-center">Choose your campus</h2>
                <div className="space-y-3">
                  {SCHOOLS.map(school => (
                    <button
                      key={school.id}
                      onClick={() => selectSchool(school)}
                      className="w-full border-2 border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50 rounded-xl px-5 py-4 text-left transition-all"
                    >
                      <p className="text-sm font-semibold text-gray-800">{school.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Step 2 — Login form */
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-gray-700 text-base font-semibold">Sign in to your account</h2>
                  <button onClick={() => setSelectedSchool(null)} className="text-xs text-indigo-500 hover:text-indigo-700 underline">
                    Change
                  </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">Email Address</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">Password</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">#</span>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full border border-gray-300 rounded-lg pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-xs text-red-700 flex items-center gap-2">
                      <span>!</span> {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-semibold text-sm hover:from-indigo-700 hover:to-blue-700 disabled:opacity-60 transition-all shadow-md hover:shadow-lg mt-2"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Signing in...
                      </span>
                    ) : "Sign In"}
                  </button>
                </form>

                <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                  <p className="text-xs text-gray-400">Contact your administrator if you need access</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-blue-200 text-xs mt-4 opacity-60">
          © 2025 {selectedSchool?.name ?? 'Wisdom School'}. All rights reserved.
        </p>
      </div>
    </div>
  );
}

