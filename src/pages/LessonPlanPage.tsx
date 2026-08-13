import { useState, useEffect } from 'react';
import axios from 'axios';
import { getAPI } from '../utils/api';
const API = getAPI();

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

const STATUS_COLOR: Record<string, string> = {
  draft:           'bg-gray-100 text-gray-600',
  submitted:       'bg-blue-100 text-blue-700',
  approved:        'bg-green-100 text-green-700',
  needs_revision:  'bg-yellow-100 text-yellow-700',
};
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', submitted: 'Submitted', approved: 'Approved', needs_revision: 'Needs Revision',
};

const NCERT_GRADES = ['Grade 8', 'Grade 9', 'Grade 10'];

const FIELD_LABELS: Record<string, string> = {
  focus_question: 'Focus Question',
  learning_objectives: 'Learning Objectives',
  key_vocabulary: 'Key Vocabulary',
  possible_misconceptions: 'Possible Misconceptions',
  materials: 'Materials',
  digital_resources: 'Digital Resources',
  tech_contingency: 'Tech Contingency',
  differentiation_strategies: 'Differentiation Strategies',
  interdisciplinary_approach: 'Interdisciplinary Approach',
  rework: 'Rework (Remediation)',
  homework: 'Homework',
};

const FIVE_E = [
  { key: 'engage',   label: 'Engage',   color: 'bg-purple-50 border-purple-300' },
  { key: 'explore',  label: 'Explore',  color: 'bg-blue-50 border-blue-300' },
  { key: 'explain',  label: 'Explain',  color: 'bg-green-50 border-green-300' },
  { key: 'extend',   label: 'Extend',   color: 'bg-orange-50 border-orange-300' },
  { key: 'evaluate', label: 'Evaluate', color: 'bg-red-50 border-red-300' },
];

function emptyPlan(user: any, academicYear: string, grade: string, section: string, subject: string) {
  return {
    teacher_id: user.id, academic_year: academicYear,
    grade, section, subject,
    chapter_name: '', lesson_name: '', date: '', duration: 45,
    focus_question: '', learning_objectives: '', key_vocabulary: '',
    possible_misconceptions: '', materials: '', digital_resources: '',
    tech_contingency: '', differentiation_strategies: '', interdisciplinary_approach: '',
    engage_content: '', engage_duration: 7,
    explore_content: '', explore_duration: 10,
    explain_content: '', explain_duration: 15,
    extend_content: '', extend_duration: 8,
    evaluate_content: '', evaluate_duration: 5,
    rework: '', homework: '', worksheet_content: '',
    source: 'digital', status: 'draft',
  };
}

interface Props {
  user: any;
  mappings: any;
  academicYear: string;
  readOnly?: boolean;
}

export default function LessonPlanPage({ user, mappings, academicYear, readOnly = false }: Props) {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [wsLoading, setWsLoading] = useState(false);
  const [hwLoading, setHwLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [comment, setComment] = useState('');
  const [commentStatus, setCommentStatus] = useState('approved');
  const [commentLoading, setCommentLoading] = useState(false);
  const [paramOverrides, setParamOverrides] = useState<any>({});
  const [showOverrides, setShowOverrides] = useState(false);

  // Chapter plan (multi-LP generation)
  const [chapterMode, setChapterMode] = useState(false);
  const [lpCount, setLpCount] = useState(3);
  const [startDate, setStartDate] = useState('');
  const [lpDuration, setLpDuration] = useState(45);
  const [chapterForMulti, setChapterForMulti] = useState('');
  const [lpSuggestion, setLpSuggestion] = useState<{ suggested_lps: number; reason: string } | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [chapterGenLoading, setChapterGenLoading] = useState(false);

  // For admin/AHM view: all plans
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [gradeFilter, setGradeFilter] = useState('');

  const ncertMappings = mappings?.mappings?.filter((m: any) =>
    NCERT_GRADES.includes(m.grade),
  ) || [];
  const subjects = [...new Set(ncertMappings.map((m: any) => m.subject))] as string[];
  const [activeSubject, setActiveSubject] = useState(subjects[0] || '');

  const activeMapping = ncertMappings.find((m: any) => m.subject === activeSubject);
  const grade = activeMapping?.grade || '';
  const section = activeMapping?.section || '';

  useEffect(() => {
    if (readOnly) fetchAllPlans();
    else if (user?.id) fetchPlans();
  }, [academicYear, user?.id, readOnly]);

  useEffect(() => {
    if (grade && activeSubject) fetchChapters(grade, activeSubject);
  }, [grade, activeSubject]);

  async function fetchPlans() {
    try {
      const r = await axios.get(`${API}/lesson-plans`, {
        params: { teacher_id: user.id, academic_year: academicYear },
      });
      setPlans(r.data);
    } catch { /**/ }
  }

  async function fetchAllPlans() {
    try {
      const r = await axios.get(`${API}/lesson-plans/all`, {
        params: { academic_year: academicYear, grade: gradeFilter || undefined, status: statusFilter !== 'all' ? statusFilter : undefined },
      });
      setAllPlans(r.data);
    } catch { /**/ }
  }

  async function fetchChapters(g: string, s: string) {
    try {
      const r = await axios.get(`${API}/lesson-plans/ncert/chapters`, { params: { grade: g, subject: s } });
      setChapters(r.data);
    } catch { /**/ }
  }

  function openNew() {
    setForm(emptyPlan(user, academicYear, grade, section, activeSubject));
    setSelectedPlan(null);
    setIsEditing(true);
    setParamOverrides({});
    setShowOverrides(false);
  }

  function openEdit(plan: any) {
    setForm({ ...plan });
    setSelectedPlan(plan);
    setIsEditing(true);
    setParamOverrides({});
    setShowOverrides(false);
  }

  function openView(plan: any) {
    setSelectedPlan(plan);
    setIsEditing(false);
  }

  async function savePlan() {
    setLoading(true);
    try {
      if (selectedPlan?.id) {
        await axios.patch(`${API}/lesson-plans/${selectedPlan.id}`, form);
      } else {
        const r = await axios.post(`${API}/lesson-plans`, form);
        setSelectedPlan(r.data);
        setForm((f: any) => ({ ...f, id: r.data.id }));
        await axios.patch(`${API}/lesson-plans/${r.data.id}`, form);
      }
      await fetchPlans();
      setIsEditing(false);
    } catch (e: any) {
      alert('Save failed: ' + (e.message || ''));
    } finally { setLoading(false); }
  }

  async function submitPlan(id: string) {
    await axios.post(`${API}/lesson-plans/${id}/submit`);
    await fetchPlans();
    setSelectedPlan((p: any) => p ? { ...p, status: 'submitted' } : p);
  }

  async function deletePlan(id: string) {
    if (!confirm('Delete this draft?')) return;
    await axios.delete(`${API}/lesson-plans/${id}`);
    await fetchPlans();
    setSelectedPlan(null);
    setIsEditing(false);
  }

  async function generateAI() {
    if (!form.chapter_name || !form.lesson_name || !form.focus_question) {
      alert('Fill in Chapter, Lesson Name, and Focus Question before generating.');
      return;
    }
    setAiLoading(true);
    try {
      const r = await axios.post(`${API}/lesson-plans/ai/generate`, {
        teacher_id: user.id,
        grade: form.grade,
        subject: form.subject,
        chapter_name: form.chapter_name,
        lesson_name: form.lesson_name,
        focus_question: form.focus_question,
        duration: form.duration || 45,
        parameter_overrides: showOverrides ? paramOverrides : {},
      });
      setForm((f: any) => ({ ...f, ...r.data }));
    } catch (e: any) {
      alert('AI generation failed: ' + (e.response?.data?.message || e.message));
    } finally { setAiLoading(false); }
  }

  async function generateWorksheet() {
    if (!selectedPlan?.id) return;
    setWsLoading(true);
    try {
      const r = await axios.post(`${API}/lesson-plans/${selectedPlan.id}/generate-worksheet`);
      setSelectedPlan((p: any) => ({ ...p, worksheet_content: JSON.stringify(r.data) }));
    } catch (e: any) {
      alert('Worksheet generation failed: ' + (e.message || ''));
    } finally { setWsLoading(false); }
  }

  async function suggestLpCount() {
    if (!chapterForMulti) { alert('Select a chapter first.'); return; }
    setSuggestLoading(true);
    try {
      const r = await axios.post(`${API}/lesson-plans/ai/suggest-lp-count`, {
        grade, subject: activeSubject, chapter_name: chapterForMulti,
      });
      setLpSuggestion(r.data);
      setLpCount(r.data.suggested_lps || 3);
    } catch { alert('Could not get suggestion. Check that the chapter PDF is uploaded.'); }
    finally { setSuggestLoading(false); }
  }

  async function generateChapterPlans() {
    if (!chapterForMulti || !lpCount) { alert('Select a chapter and LP count first.'); return; }
    setChapterGenLoading(true);
    try {
      await axios.post(`${API}/lesson-plans/ai/generate-chapter`, {
        teacher_id: user.id, academic_year: academicYear,
        grade, section, subject: activeSubject,
        chapter_name: chapterForMulti, total_lps: lpCount,
        duration: lpDuration, start_date: startDate || undefined,
        parameter_overrides: showOverrides ? paramOverrides : {},
      });
      setChapterMode(false);
      setChapterForMulti('');
      setLpSuggestion(null);
      await fetchPlans();
    } catch (e: any) {
      alert('Generation failed: ' + (e.response?.data?.message || e.message));
    } finally { setChapterGenLoading(false); }
  }

  async function generateHomework() {
    if (!selectedPlan?.id) return;
    setHwLoading(true);
    try {
      const r = await axios.post(`${API}/lesson-plans/${selectedPlan.id}/generate-homework`);
      setSelectedPlan((p: any) => ({ ...p, homework: JSON.stringify(r.data) }));
    } catch (e: any) {
      alert('Homework generation failed: ' + (e.message || ''));
    } finally { setHwLoading(false); }
  }

  async function postComment(planId: string) {
    if (!comment.trim()) return;
    setCommentLoading(true);
    try {
      await axios.post(`${API}/lesson-plans/${planId}/comments`, {
        reviewer_id: user.id,
        reviewer_name: user.name,
        reviewer_role: user.role,
        comment: comment.trim(),
        status_set: commentStatus,
      });
      setComment('');
      if (readOnly) fetchAllPlans();
      else fetchPlans();
      const r = await axios.get(`${API}/lesson-plans/${planId}`);
      setSelectedPlan(r.data);
    } finally { setCommentLoading(false); }
  }

  const filtered = readOnly
    ? allPlans
    : plans.filter(p => statusFilter === 'all' || p.status === statusFilter);

  // ── Admin / AHM / Principal view ─────────────────────────────────────────

  if (readOnly) {
    return (
      <div className="flex h-full">
        {/* List */}
        <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
          <div className="p-3 border-b space-y-2">
            <h2 className="font-semibold text-sm text-gray-700">Lesson Plans</h2>
            <select className="w-full text-xs border rounded px-2 py-1" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="needs_revision">Needs Revision</option>
            </select>
            <select className="w-full text-xs border rounded px-2 py-1" value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}>
              <option value="">All Grades</option>
              {NCERT_GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
            <button onClick={fetchAllPlans} className="w-full text-xs bg-indigo-600 text-white rounded py-1 hover:bg-indigo-700">Filter</button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y text-xs">
            {filtered.map(p => (
              <button key={p.id} onClick={() => openView(p)} className={`w-full text-left p-3 hover:bg-gray-50 ${selectedPlan?.id === p.id ? 'bg-indigo-50' : ''}`}>
                <div className="font-medium text-gray-800 truncate">{p.teacher_name}</div>
                <div className="text-gray-500">{p.grade} · {p.subject}</div>
                <div className="text-gray-400 truncate">{p.chapter_name} — {p.lesson_name}</div>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${STATUS_COLOR[p.status]}`}>{STATUS_LABEL[p.status]}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="p-4 text-gray-400">No plans found.</p>}
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-y-auto p-4">
          {selectedPlan ? (
            <PlanDetail plan={selectedPlan} user={user} readOnly
              comment={comment} setComment={setComment}
              commentStatus={commentStatus} setCommentStatus={setCommentStatus}
              commentLoading={commentLoading} onComment={() => postComment(selectedPlan.id)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">Select a lesson plan to review</div>
          )}
        </div>
      </div>
    );
  }

  // ── Teacher view ──────────────────────────────────────────────────────────

  return (
    <div className="flex h-full">
      {/* Left: subject tabs + list */}
      <div className="w-72 border-r border-gray-200 flex flex-col bg-white">
        {/* Subject tabs */}
        {subjects.length > 1 && (
          <div className="flex flex-wrap gap-1 p-2 border-b">
            {subjects.map(s => (
              <button key={s} onClick={() => setActiveSubject(s)}
                className={`px-2 py-1 rounded text-xs font-medium ${activeSubject === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >{s}</button>
            ))}
          </div>
        )}

        {ncertMappings.length === 0 && (
          <p className="p-4 text-xs text-gray-400">No Grade 8–10 subjects assigned. Lesson Plans are for NCERT grades only.</p>
        )}

        {/* Status filter */}
        <div className="p-2 border-b flex gap-1 flex-wrap">
          {['all','draft','submitted','approved','needs_revision'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2 py-0.5 rounded text-xs ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}
            >{s === 'all' ? 'All' : STATUS_LABEL[s]}</button>
          ))}
        </div>

        {/* New plan button */}
        {ncertMappings.length > 0 && (
          <div className="p-2 border-b space-y-1">
            <button onClick={openNew} className="w-full bg-indigo-600 text-white text-xs py-1.5 rounded hover:bg-indigo-700 font-medium">
              + New Single Lesson Plan
            </button>
            <button onClick={() => { setChapterMode(true); setIsEditing(false); setSelectedPlan(null); }}
              className="w-full bg-purple-600 text-white text-xs py-1.5 rounded hover:bg-purple-700 font-medium">
              ✨ Generate Full Chapter Plans
            </button>
          </div>
        )}

        {/* Plan list */}
        <div className="flex-1 overflow-y-auto divide-y text-xs">
          {filtered.map(p => (
            <button key={p.id} onClick={() => openView(p)}
              className={`w-full text-left p-3 hover:bg-gray-50 ${selectedPlan?.id === p.id ? 'bg-indigo-50' : ''}`}>
              <div className="flex items-center gap-1">
                {p.total_lps && <span className="text-purple-600 font-bold text-xs shrink-0">LP {p.lp_number}/{p.total_lps}</span>}
                <span className="font-medium text-gray-800 truncate">{p.chapter_name || 'Untitled'}</span>
              </div>
              <div className="text-gray-500 truncate">{p.lesson_name}</div>
              <div className="text-gray-400">{p.date || ''}</div>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${STATUS_COLOR[p.status]}`}>{STATUS_LABEL[p.status]}</span>
            </button>
          ))}
          {filtered.length === 0 && <p className="p-4 text-gray-400">No plans yet.</p>}
        </div>
      </div>

      {/* Right: form or detail */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {chapterMode ? (
          <ChapterPlanPanel
            chapters={chapters} grade={grade} subject={activeSubject}
            chapterForMulti={chapterForMulti} setChapterForMulti={setChapterForMulti}
            lpCount={lpCount} setLpCount={setLpCount}
            lpDuration={lpDuration} setLpDuration={setLpDuration}
            startDate={startDate} setStartDate={setStartDate}
            lpSuggestion={lpSuggestion} suggestLoading={suggestLoading}
            chapterGenLoading={chapterGenLoading}
            paramOverrides={paramOverrides} setParamOverrides={setParamOverrides}
            showOverrides={showOverrides} setShowOverrides={setShowOverrides}
            onSuggest={suggestLpCount} onGenerate={generateChapterPlans}
            onCancel={() => setChapterMode(false)}
          />
        ) : isEditing ? (
          <PlanForm
            form={form} setForm={setForm} chapters={chapters}
            loading={loading} aiLoading={aiLoading}
            paramOverrides={paramOverrides} setParamOverrides={setParamOverrides}
            showOverrides={showOverrides} setShowOverrides={setShowOverrides}
            onSave={savePlan} onCancel={() => setIsEditing(false)} onGenerateAI={generateAI}
          />
        ) : selectedPlan ? (
          <PlanDetail
            plan={selectedPlan} user={user}
            onEdit={() => openEdit(selectedPlan)}
            onSubmit={() => submitPlan(selectedPlan.id)}
            onDelete={() => deletePlan(selectedPlan.id)}
            onGenerateWorksheet={generateWorksheet} wsLoading={wsLoading}
            onGenerateHomework={generateHomework} hwLoading={hwLoading}
            comment={comment} setComment={setComment}
            commentStatus={commentStatus} setCommentStatus={setCommentStatus}
            commentLoading={commentLoading} onComment={() => postComment(selectedPlan.id)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            {ncertMappings.length > 0 ? 'Select a plan or create a new one' : 'No NCERT grade subjects assigned'}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Chapter Plan Panel ────────────────────────────────────────────────────

function ChapterPlanPanel({ chapters, grade, subject, chapterForMulti, setChapterForMulti, lpCount, setLpCount, lpDuration, setLpDuration, startDate, setStartDate, lpSuggestion, suggestLoading, chapterGenLoading, paramOverrides, setParamOverrides, showOverrides, setShowOverrides, onSuggest, onGenerate, onCancel }: any) {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-800">Generate Full Chapter Lesson Plans</h2>
          <p className="text-xs text-gray-500 mt-0.5">{grade} · {subject}</p>
        </div>
        <button onClick={onCancel} className="text-xs border rounded px-3 py-1.5 text-gray-600 hover:bg-gray-50">Cancel</button>
      </div>

      <div className="bg-white rounded-lg border p-4 space-y-4">
        {/* Chapter selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Select Chapter</label>
          <select className="w-full border rounded px-2 py-1.5 text-xs" value={chapterForMulti} onChange={e => setChapterForMulti(e.target.value)}>
            <option value="">Choose chapter…</option>
            {chapters.map((c: any) => (
              <option key={c.id} value={c.chapter_name}>{c.chapter_number}. {c.chapter_name}</option>
            ))}
          </select>
          {chapters.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">No chapters uploaded yet. Upload NCERT PDFs in the NCERT Library first.</p>
          )}
        </div>

        {/* LP count */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            How many Lesson Plans to complete this chapter?
          </label>
          <div className="flex items-center gap-3">
            <input type="number" min={1} max={10} className="border rounded px-2 py-1.5 text-xs w-20"
              value={lpCount} onChange={e => setLpCount(+e.target.value)} />
            <button onClick={onSuggest} disabled={suggestLoading || !chapterForMulti}
              className="px-3 py-1.5 text-xs bg-purple-100 text-purple-700 border border-purple-300 rounded hover:bg-purple-200 disabled:opacity-50">
              {suggestLoading ? '⟳ Asking AI…' : '🤖 Ask AI to suggest'}
            </button>
          </div>

          {/* AI suggestion badge */}
          {lpSuggestion && (
            <div className="mt-2 bg-purple-50 border border-purple-200 rounded p-2 text-xs">
              <span className="font-semibold text-purple-700">AI suggests: {lpSuggestion.suggested_lps} lesson plans</span>
              <p className="text-gray-600 mt-0.5">{lpSuggestion.reason}</p>
              <button onClick={() => setLpCount(lpSuggestion.suggested_lps)}
                className="mt-1 text-purple-600 hover:underline">Use this suggestion</button>
            </div>
          )}
        </div>

        {/* Duration + Start date */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-gray-600 mb-1">Duration per class (minutes)</label>
            <input type="number" className="w-full border rounded px-2 py-1" min={20} max={120}
              value={lpDuration} onChange={e => setLpDuration(+e.target.value)} />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Date of first class (optional)</label>
            <input type="date" className="w-full border rounded px-2 py-1"
              value={startDate} onChange={e => setStartDate(e.target.value)} />
            <p className="text-gray-400 mt-0.5">AI spaces plans 1 week apart</p>
          </div>
        </div>

        {/* Teaching style override */}
        <div>
          <button onClick={() => setShowOverrides(!showOverrides)} className="text-xs text-indigo-600 hover:underline">
            {showOverrides ? 'Hide' : 'Override teaching style for this chapter'}
          </button>
          {showOverrides && (
            <div className="mt-2 border border-purple-200 rounded-lg p-3 bg-purple-50 grid grid-cols-2 gap-2 text-xs">
              <ParamSelect label="Talk Ratio" val={paramOverrides.talk_ratio} keys={['30:70','40:60','50:50']} labels={['T30%/S70%','T40%/S60%','T50%/S50%']} onChange={(v: string) => setParamOverrides((p: any) => ({ ...p, talk_ratio: v }))} />
              <ParamSelect label="Approach" val={paramOverrides.learning_approach} keys={['student-centric','teacher-led','inquiry-based','problem-based']} labels={['Student-Centric','Teacher-Led','Inquiry-Based','Problem-Based']} onChange={(v: string) => setParamOverrides((p: any) => ({ ...p, learning_approach: v }))} />
              <ParamSelect label="Collaboration" val={paramOverrides.collaboration_mode} keys={['individual','pairs','small-groups','whole-class']} labels={['Individual','Pairs','Small Groups','Whole Class']} onChange={(v: string) => setParamOverrides((p: any) => ({ ...p, collaboration_mode: v }))} />
              <ParamSelect label="Bloom's Level" val={paramOverrides.blooms_level} keys={['remember','understand','apply','analyze','evaluate','create']} labels={['Remember','Understand','Apply','Analyze','Evaluate','Create']} onChange={(v: string) => setParamOverrides((p: any) => ({ ...p, blooms_level: v }))} />
            </div>
          )}
        </div>
      </div>

      {/* Summary + Generate button */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p className="text-xs text-purple-800 font-medium mb-3">
          AI will generate <strong>{lpCount} lesson plans</strong> for "{chapterForMulti || '(no chapter selected)'}", each covering a different sequential portion of the chapter. They will appear in your Lesson Plans list as LP 1 of {lpCount}, LP 2 of {lpCount}, etc.
        </p>
        <button onClick={onGenerate} disabled={chapterGenLoading || !chapterForMulti || !lpCount}
          className="w-full py-2.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50 font-semibold">
          {chapterGenLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin inline-block">⟳</span>
              Generating {lpCount} lesson plans… this may take 20–40 seconds
            </span>
          ) : `✨ Generate All ${lpCount} Lesson Plans`}
        </button>
      </div>
    </div>
  );
}

// ── Plan Form ─────────────────────────────────────────────────────────────

function PlanForm({ form, setForm, chapters, loading, aiLoading, paramOverrides, setParamOverrides, showOverrides, setShowOverrides, onSave, onCancel, onGenerateAI }: any) {
  const f = (key: string) => (e: any) => setForm((prev: any) => ({ ...prev, [key]: e.target.value }));
  const n = (key: string) => (e: any) => setForm((prev: any) => ({ ...prev, [key]: +e.target.value }));

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-800 text-sm">{form.id ? 'Edit' : 'New'} Lesson Plan — {form.grade} {form.section} · {form.subject}</h2>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs border rounded text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={onSave} disabled={loading} className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="bg-white rounded-lg border p-4 space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lesson Details</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-gray-600 mb-1">Chapter</label>
            <select className="w-full border rounded px-2 py-1" value={form.chapter_name || ''} onChange={f('chapter_name')}>
              <option value="">Select chapter…</option>
              {chapters.map((c: any) => (
                <option key={c.id} value={c.chapter_name}>{c.chapter_number}. {c.chapter_name}</option>
              ))}
              <option value="__custom__">Type manually…</option>
            </select>
            {form.chapter_name === '__custom__' && (
              <input className="w-full border rounded px-2 py-1 mt-1" placeholder="Chapter name" onChange={f('chapter_name')} />
            )}
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Lesson Name</label>
            <input className="w-full border rounded px-2 py-1" value={form.lesson_name || ''} onChange={f('lesson_name')} placeholder="e.g. Newton's First Law" />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Date</label>
            <input type="date" className="w-full border rounded px-2 py-1" value={form.date || ''} onChange={f('date')} />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Duration (minutes)</label>
            <input type="number" className="w-full border rounded px-2 py-1" value={form.duration || 45} onChange={n('duration')} min={20} max={120} />
          </div>
          <div className="col-span-2">
            <label className="block text-gray-600 mb-1">Focus Question</label>
            <input className="w-full border rounded px-2 py-1" value={form.focus_question || ''} onChange={f('focus_question')} placeholder="The central question this lesson answers…" />
          </div>
        </div>

        {/* AI Generate */}
        <div className="pt-2 border-t">
          <div className="flex items-center gap-3">
            <button onClick={onGenerateAI} disabled={aiLoading}
              className="px-4 py-1.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 font-medium flex items-center gap-1">
              {aiLoading ? <><span className="animate-spin">⟳</span> Generating…</> : '✨ Generate with AI (Groq)'}
            </button>
            <button onClick={() => setShowOverrides(!showOverrides)} className="text-xs text-indigo-600 hover:underline">
              {showOverrides ? 'Hide' : 'Override teaching style for this lesson'}
            </button>
          </div>
          {chapters.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">No chapters uploaded for this subject. Admin must upload NCERT PDFs first.</p>
          )}

          {/* Parameter overrides */}
          {showOverrides && (
            <div className="mt-3 border border-purple-200 rounded-lg p-3 bg-purple-50 grid grid-cols-2 gap-2 text-xs">
              <ParamSelect label="Talk Ratio" val={paramOverrides.talk_ratio} keys={['30:70','40:60','50:50']} labels={['T30%/S70%','T40%/S60%','T50%/S50%']} onChange={v => setParamOverrides((p: any) => ({ ...p, talk_ratio: v }))} />
              <ParamSelect label="Approach" val={paramOverrides.learning_approach} keys={['student-centric','teacher-led','inquiry-based','problem-based']} labels={['Student-Centric','Teacher-Led','Inquiry-Based','Problem-Based']} onChange={v => setParamOverrides((p: any) => ({ ...p, learning_approach: v }))} />
              <ParamSelect label="Collaboration" val={paramOverrides.collaboration_mode} keys={['individual','pairs','small-groups','whole-class']} labels={['Individual','Pairs','Small Groups','Whole Class']} onChange={v => setParamOverrides((p: any) => ({ ...p, collaboration_mode: v }))} />
              <ParamSelect label="Bloom's Level" val={paramOverrides.blooms_level} keys={['remember','understand','apply','analyze','evaluate','create']} labels={['Remember','Understand','Apply','Analyze','Evaluate','Create']} onChange={v => setParamOverrides((p: any) => ({ ...p, blooms_level: v }))} />
              <ParamSelect label="Learning Style" val={paramOverrides.learning_style} keys={['visual','kinesthetic','reading-writing','mixed']} labels={['Visual','Kinesthetic','Reading/Writing','Mixed']} onChange={v => setParamOverrides((p: any) => ({ ...p, learning_style: v }))} />
              <ParamSelect label="Learning Type" val={paramOverrides.learning_type} keys={['competency-based','experiential','activity-based','case-based']} labels={['Competency-Based','Experiential','Activity-Based','Case-Based']} onChange={v => setParamOverrides((p: any) => ({ ...p, learning_type: v }))} />
              <ParamSelect label="Questioning" val={paramOverrides.questioning_technique} keys={['closed','open-ended','probing','socratic']} labels={['Closed','Open-Ended','Probing','Socratic']} onChange={v => setParamOverrides((p: any) => ({ ...p, questioning_technique: v }))} />
              <ParamSelect label="TLM" val={paramOverrides.tlm_type} keys={['physical','digital','both']} labels={['Physical','Digital','Both']} onChange={v => setParamOverrides((p: any) => ({ ...p, tlm_type: v }))} />
            </div>
          )}
        </div>
      </div>

      {/* Text fields */}
      <div className="bg-white rounded-lg border p-4 space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lesson Context</h3>
        {['learning_objectives','key_vocabulary','possible_misconceptions','materials','digital_resources','tech_contingency','differentiation_strategies','interdisciplinary_approach'].map(key => (
          <div key={key}>
            <label className="block text-xs text-gray-600 mb-1">{FIELD_LABELS[key]}</label>
            <textarea rows={2} className="w-full border rounded px-2 py-1 text-xs" value={form[key] || ''} onChange={f(key)} />
          </div>
        ))}
      </div>

      {/* 5E */}
      <div className="space-y-3">
        {FIVE_E.map(e => (
          <div key={e.key} className={`rounded-lg border-2 p-4 space-y-2 ${e.color}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-700">{e.label}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Duration:</span>
                <input type="number" min={0} max={60}
                  className="border rounded px-2 py-0.5 text-xs w-16"
                  value={form[`${e.key}_duration`] || 0}
                  onChange={n(`${e.key}_duration`)} />
                <span className="text-xs text-gray-500">min</span>
              </div>
            </div>
            <textarea rows={4} className="w-full border rounded px-2 py-1 text-xs bg-white"
              value={form[`${e.key}_content`] || ''} onChange={f(`${e.key}_content`)}
              placeholder={`Describe the ${e.label} activity…`} />
          </div>
        ))}
      </div>

      {/* Rework + Homework */}
      <div className="bg-white rounded-lg border p-4 space-y-3">
        {['rework','homework'].map(key => (
          <div key={key}>
            <label className="block text-xs text-gray-600 mb-1">{FIELD_LABELS[key]}</label>
            <textarea rows={2} className="w-full border rounded px-2 py-1 text-xs" value={form[key] || ''} onChange={f(key)} />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pb-8">
        <button onClick={onCancel} className="px-4 py-2 text-xs border rounded text-gray-600 hover:bg-gray-50">Cancel</button>
        <button onClick={onSave} disabled={loading} className="px-4 py-2 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
          {loading ? 'Saving…' : 'Save Plan'}
        </button>
      </div>
    </div>
  );
}

function ParamSelect({ label, val, keys, labels, onChange }: any) {
  return (
    <div>
      <label className="block text-gray-600 mb-0.5">{label}</label>
      <select className="w-full border rounded px-2 py-1 bg-white" value={val || ''} onChange={e => onChange(e.target.value)}>
        <option value="">— use profile default —</option>
        {keys.map((k: string, i: number) => <option key={k} value={k}>{labels[i]}</option>)}
      </select>
    </div>
  );
}

// ── Plan Detail ───────────────────────────────────────────────────────────

function PlanDetail({ plan, user, readOnly, onEdit, onSubmit, onDelete, onGenerateWorksheet, wsLoading, onGenerateHomework, hwLoading, comment, setComment, commentStatus, setCommentStatus, commentLoading, onComment }: any) {
  const canEdit = plan.status === 'draft' || plan.status === 'needs_revision';
  const canSubmit = canEdit;
  const isReviewer = ['admin','principal','ahm'].includes(user?.role);

  let worksheet: any = null;
  let homework: any = null;
  try { if (plan.worksheet_content) worksheet = JSON.parse(plan.worksheet_content); } catch { /**/ }
  try { if (plan.homework && plan.homework.startsWith('{')) homework = JSON.parse(plan.homework); } catch { /**/ }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-800">{plan.chapter_name} — {plan.lesson_name}</h2>
          <p className="text-xs text-gray-500">{plan.grade} · {plan.section} · {plan.subject} · {plan.date}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLOR[plan.status]}`}>{STATUS_LABEL[plan.status]}</span>
          {plan.source === 'ai_generated' && <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">AI Generated</span>}
        </div>
      </div>

      {!readOnly && (
        <div className="flex gap-2">
          {canEdit && <button onClick={onEdit} className="text-xs px-3 py-1.5 border rounded hover:bg-gray-50">Edit</button>}
          {canSubmit && <button onClick={onSubmit} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700">Submit for Review</button>}
          {plan.status === 'draft' && <button onClick={onDelete} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100">Delete</button>}
          {plan.id && <button onClick={onGenerateWorksheet} disabled={wsLoading} className="text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">{wsLoading ? 'Generating…' : '📄 Worksheet'}</button>}
          {plan.id && <button onClick={onGenerateHomework} disabled={hwLoading} className="text-xs px-3 py-1.5 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50">{hwLoading ? 'Generating…' : '📝 Homework'}</button>}
        </div>
      )}

      {/* Context fields */}
      <div className="bg-white rounded-lg border p-4 space-y-3 text-xs">
        <div><span className="font-semibold text-gray-600">Duration:</span> {plan.duration} min</div>
        {plan.focus_question && <div><span className="font-semibold text-gray-600">Focus Question:</span> {plan.focus_question}</div>}
        {['learning_objectives','key_vocabulary','possible_misconceptions','materials','digital_resources','tech_contingency','differentiation_strategies','interdisciplinary_approach'].map(key =>
          plan[key] ? (
            <div key={key}>
              <span className="font-semibold text-gray-600">{FIELD_LABELS[key]}:</span>
              <p className="text-gray-700 whitespace-pre-line mt-0.5">{plan[key]}</p>
            </div>
          ) : null,
        )}
      </div>

      {/* 5E */}
      <div className="space-y-3">
        {FIVE_E.map(e => (
          <div key={e.key} className={`rounded-lg border-2 p-4 ${e.color}`}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-sm text-gray-700">{e.label}</h3>
              <span className="text-xs text-gray-500">{plan[`${e.key}_duration`] || 0} min</span>
            </div>
            <p className="text-xs text-gray-700 whitespace-pre-line">{plan[`${e.key}_content`] || '—'}</p>
          </div>
        ))}
      </div>

      {/* Rework + Homework */}
      <div className="bg-white rounded-lg border p-4 space-y-3 text-xs">
        {['rework','homework'].map(key =>
          plan[key] && !plan[key].startsWith('{') ? (
            <div key={key}>
              <span className="font-semibold text-gray-600">{FIELD_LABELS[key]}:</span>
              <p className="text-gray-700 whitespace-pre-line mt-0.5">{plan[key]}</p>
            </div>
          ) : null,
        )}
      </div>

      {/* AI-generated homework */}
      {homework && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-xs">
          <h3 className="font-semibold text-orange-700 mb-2">Homework (AI Generated)</h3>
          <p className="text-gray-700 mb-2">{homework.instructions}</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-700">
            {(homework.tasks || []).map((t: string, i: number) => <li key={i}>{t}</li>)}
          </ol>
        </div>
      )}

      {/* Worksheet */}
      {worksheet && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-xs space-y-3">
          <h3 className="font-semibold text-green-700">Worksheet: {worksheet.title}</h3>
          {[['Warm-Up', 'warm_up'],['Explore Activity','explore_activity'],['Concept Check','concept_check'],['Application','application'],['Exit Ticket','exit_ticket']].map(([label, key]) =>
            worksheet[key] ? (
              <div key={key}>
                <span className="font-semibold text-gray-600">{label}:</span>
                <p className="text-gray-700 whitespace-pre-line mt-0.5">{worksheet[key]}</p>
              </div>
            ) : null,
          )}
        </div>
      )}

      {/* Comments */}
      {(plan.comments || []).length > 0 && (
        <div className="bg-white rounded-lg border p-4 space-y-2 text-xs">
          <h3 className="font-semibold text-gray-600">Reviewer Comments</h3>
          {plan.comments.map((c: any) => (
            <div key={c.id} className="border-l-4 border-indigo-300 pl-3 py-1">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">{c.reviewer_name} <span className="text-gray-400 capitalize">({c.reviewer_role})</span></span>
                {c.status_set && <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLOR[c.status_set]}`}>{STATUS_LABEL[c.status_set]}</span>}
              </div>
              <p className="text-gray-600 mt-0.5">{c.comment}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add comment (reviewer roles or readOnly mode) */}
      {(isReviewer || readOnly) && plan.status !== 'draft' && (
        <div className="bg-white rounded-lg border p-4 space-y-2 text-xs">
          <h3 className="font-semibold text-gray-600">Add Review</h3>
          <textarea rows={3} className="w-full border rounded px-2 py-1" placeholder="Write your feedback…"
            value={comment} onChange={e => setComment(e.target.value)} />
          <div className="flex items-center gap-3">
            <select className="border rounded px-2 py-1" value={commentStatus} onChange={e => setCommentStatus(e.target.value)}>
              <option value="approved">Approve</option>
              <option value="needs_revision">Needs Revision</option>
            </select>
            <button onClick={onComment} disabled={commentLoading || !comment.trim()}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
              {commentLoading ? 'Saving…' : 'Save Review'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
