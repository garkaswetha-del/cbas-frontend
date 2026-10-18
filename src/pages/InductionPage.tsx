import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { getAPI, getSchoolName } from "../utils/api";

const API = getAPI();
// Small buffer so a natural re-sync near the watched edge isn't treated as a skip attempt
const SEEK_BUFFER_SECONDS = 3;
const REPORT_INTERVAL_MS = 5000;

interface Assignment {
  id: string; video_id: string; watched_seconds: number; max_position_reached: number;
  completed: boolean; due_at: string | null;
  video: { id: string; title: string; description: string; video_url: string; duration_seconds: number };
}

function fmtPct(watched: number, duration: number) {
  if (!duration) return 0;
  return Math.min(100, Math.round((watched / duration) * 100));
}

export default function InductionPage({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/hr/induction/my/${user.id}`);
      setAssignments(r.data || []);
    } catch { setAssignments([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [user.id]);

  const active = assignments.find(a => a.id === activeId) || null;
  const allDone = assignments.length > 0 && assignments.every(a => a.completed);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-indigo-900 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-white text-sm font-bold">{getSchoolName()}</h1>
          <p className="text-indigo-300 text-xs">Induction · Welcome, {user?.name}</p>
        </div>
        <button onClick={onLogout} className="text-indigo-300 hover:text-white text-xs">🚪 Sign Out</button>
      </div>

      <div className="flex-1 p-4 sm:p-6 max-w-3xl mx-auto w-full">
        {allDone && (
          <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-300 rounded-xl text-sm text-emerald-800">
            🎉 You've completed all your induction videos. The admin team will confirm and finish setting up your account shortly.
          </div>
        )}

        {active ? (
          <VideoPlayer
            assignment={active}
            userId={user.id}
            onBack={() => setActiveId(null)}
            onProgress={load}
          />
        ) : loading ? (
          <div className="p-8 text-center text-gray-400 text-sm bg-white rounded-xl border border-gray-200">Loading…</div>
        ) : assignments.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
            No induction videos assigned yet — check back soon.
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map(a => (
              <button
                key={a.id}
                onClick={() => setActiveId(a.id)}
                className="w-full text-left bg-white rounded-xl shadow border border-gray-200 p-4 hover:border-indigo-400 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{a.video.title}</p>
                    {a.video.description && <p className="text-xs text-gray-500 mt-0.5">{a.video.description}</p>}
                    {a.due_at && <p className="text-xs text-gray-400 mt-1">Due by {new Date(a.due_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>}
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    {a.completed ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">✓ Completed</span>
                    ) : (
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full font-medium">
                        {fmtPct(a.watched_seconds, a.video.duration_seconds)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: `${fmtPct(a.watched_seconds, a.video.duration_seconds)}%` }} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VideoPlayer({ assignment, userId, onBack, onProgress }: { assignment: Assignment; userId: string; onBack: () => void; onProgress: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const maxReachedRef = useRef(Number(assignment.max_position_reached) || 0);
  const lastReportedRef = useRef(0);
  const [displayPct, setDisplayPct] = useState(fmtPct(assignment.watched_seconds, assignment.video.duration_seconds));
  const [justCompleted, setJustCompleted] = useState(false);

  const report = async (position: number) => {
    try {
      const r = await axios.post(`${API}/hr/induction/progress`, { user_id: userId, video_id: assignment.video_id, position });
      const watched = Number(r.data?.watched_seconds) || 0;
      setDisplayPct(fmtPct(watched, assignment.video.duration_seconds));
      if (r.data?.completed && !assignment.completed) setJustCompleted(true);
    } catch { /* next interval will retry */ }
  };

  useEffect(() => {
    // Resume where they left off
    if (videoRef.current && maxReachedRef.current > 0) {
      videoRef.current.currentTime = Math.max(0, maxReachedRef.current - 1);
    }
    const interval = setInterval(() => {
      const v = videoRef.current;
      if (!v || v.paused) return;
      if (Math.abs(v.currentTime - lastReportedRef.current) < 0.5) return;
      lastReportedRef.current = v.currentTime;
      report(v.currentTime);
    }, REPORT_INTERVAL_MS);
    return () => { clearInterval(interval); onProgress(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSeeking = () => {
    const v = videoRef.current;
    if (!v) return;
    const allowed = maxReachedRef.current + SEEK_BUFFER_SECONDS;
    if (v.currentTime > allowed) v.currentTime = allowed;
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.currentTime > maxReachedRef.current) maxReachedRef.current = v.currentTime;
  };

  const handleEnded = () => {
    const v = videoRef.current;
    if (!v) return;
    report(v.duration || maxReachedRef.current);
  };

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
      <button onClick={onBack} className="text-xs text-indigo-600 hover:text-indigo-800 mb-3">← Back to videos</button>
      <h2 className="text-sm font-bold text-gray-800 mb-1">{assignment.video.title}</h2>
      {assignment.video.description && <p className="text-xs text-gray-500 mb-3">{assignment.video.description}</p>}

      {justCompleted && (
        <div className="mb-3 px-3 py-2 bg-green-50 border border-green-300 rounded-lg text-xs text-green-800">
          ✓ Marked complete — nice work.
        </div>
      )}

      <video
        ref={videoRef}
        src={assignment.video.video_url}
        controls
        controlsList="nodownload"
        onSeeking={handleSeeking}
        onTimeUpdate={handleTimeUpdate}
        onPause={() => report(videoRef.current?.currentTime || 0)}
        onEnded={handleEnded}
        className="w-full rounded-lg bg-black"
      />

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Watched</span>
          <span>{displayPct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 transition-all" style={{ width: `${displayPct}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-2">Skipping ahead won't count as watched — the bar above only fills in as you actually watch.</p>
      </div>
    </div>
  );
}
