import { useState, useEffect } from 'react';
import axios from 'axios';
import { getAPI } from '../utils/api';
const API = getAPI();

const PARAMS = [
  {
    key: 'talk_ratio', label: 'Talk Ratio (Teacher : Student)', group: 'Engagement',
    options: [{ v: '30:70', l: 'T 30% / S 70%' }, { v: '40:60', l: 'T 40% / S 60%' }, { v: '50:50', l: 'T 50% / S 50%' }],
  },
  {
    key: 'learning_approach', label: 'Learning Approach', group: 'Engagement',
    options: [{ v: 'student-centric', l: 'Student-Centric' }, { v: 'teacher-led', l: 'Teacher-Led' }, { v: 'inquiry-based', l: 'Inquiry-Based' }, { v: 'problem-based', l: 'Problem-Based' }],
  },
  {
    key: 'collaboration_mode', label: 'Collaboration Mode', group: 'Engagement',
    options: [{ v: 'individual', l: 'Individual' }, { v: 'pairs', l: 'Pairs' }, { v: 'small-groups', l: 'Small Groups (3–4)' }, { v: 'whole-class', l: 'Whole Class' }],
  },
  {
    key: 'learning_style', label: 'Learning Style Focus', group: 'Delivery',
    options: [{ v: 'visual', l: 'Visual' }, { v: 'kinesthetic', l: 'Kinesthetic (Hands-on)' }, { v: 'reading-writing', l: 'Reading / Writing' }, { v: 'mixed', l: 'Mixed' }],
  },
  {
    key: 'technology_use', label: 'Technology Use', group: 'Delivery',
    options: [{ v: 'none', l: 'No Tech (Board only)' }, { v: 'low', l: 'Low (Projector / video)' }, { v: 'both', l: 'High (Interactive tools)' }],
  },
  {
    key: 'tlm_type', label: 'TLM — Teaching Learning Materials', group: 'Delivery',
    options: [{ v: 'physical', l: 'Physical Only (charts, models)' }, { v: 'digital', l: 'Digital Only' }, { v: 'both', l: 'Both Physical + Digital' }],
  },
  {
    key: 'blooms_level', label: "Bloom's Taxonomy Target Level", group: 'Pedagogy',
    options: [
      { v: 'remember', l: 'Remember (Recall facts)' },
      { v: 'understand', l: 'Understand (Explain concepts)' },
      { v: 'apply', l: 'Apply (Use in new situation)' },
      { v: 'analyze', l: 'Analyze (Break down, compare)' },
      { v: 'evaluate', l: 'Evaluate (Judge, critique)' },
      { v: 'create', l: 'Create (Design something new)' },
    ],
  },
  {
    key: 'learning_type', label: 'Learning Type (NEP 2020)', group: 'Pedagogy',
    options: [
      { v: 'competency-based', l: 'Competency-Based (student can DO)' },
      { v: 'experiential', l: 'Experiential (learn by doing)' },
      { v: 'activity-based', l: 'Activity-Based (structured tasks)' },
      { v: 'case-based', l: 'Case-Based (real scenario analysis)' },
    ],
  },
  {
    key: 'questioning_technique', label: 'Questioning Technique', group: 'Pedagogy',
    options: [{ v: 'closed', l: 'Closed (recall answers)' }, { v: 'open-ended', l: 'Open-Ended (multiple correct)' }, { v: 'probing', l: 'Probing (follow-up questions)' }, { v: 'socratic', l: 'Socratic (student questions lead)' }],
  },
  {
    key: 'real_world_connection', label: 'Real-World / Indian Context', group: 'CBSE',
    options: [{ v: 'strong', l: 'Strong — every concept linked to daily life' }, { v: 'moderate', l: 'Moderate — connect where natural' }, { v: 'minimal', l: 'Minimal — focus on curriculum content' }],
  },
  {
    key: 'formative_assessment', label: 'Formative Assessment Method', group: 'CBSE',
    options: [{ v: 'observation', l: 'Teacher Observation' }, { v: 'oral', l: 'Oral Questioning' }, { v: 'exit-ticket', l: 'Exit Ticket (written)' }, { v: 'peer', l: 'Peer Assessment' }, { v: 'self', l: 'Self-Assessment' }],
  },
  {
    key: 'differentiation', label: 'Differentiation Level', group: 'CBSE',
    options: [{ v: 'none', l: 'Same for all students' }, { v: 'two-tiers', l: 'Two tiers (standard + advanced)' }, { v: 'three-tiers', l: 'Three tiers (support + standard + advanced)' }],
  },
  {
    key: 'inclusion_level', label: 'Inclusion & Diversity', group: 'CBSE',
    options: [{ v: 'standard', l: 'Standard (one activity for all)' }, { v: 'two-tiers', l: 'Mild differentiation (extension tasks)' }, { v: 'full', l: 'Full differentiation (support + advanced)' }],
  },
];

const SKILLS_OPTIONS = [
  { v: 'critical-thinking', l: 'Critical Thinking' },
  { v: 'creative-thinking', l: 'Creative Thinking' },
  { v: 'communication', l: 'Communication' },
  { v: 'collaboration', l: 'Collaboration' },
];

const GROUPS = ['Engagement', 'Delivery', 'Pedagogy', 'CBSE'];
const GROUP_COLOR: Record<string, string> = {
  Engagement: 'border-purple-200 bg-purple-50',
  Delivery:   'border-blue-200 bg-blue-50',
  Pedagogy:   'border-green-200 bg-green-50',
  CBSE:       'border-orange-200 bg-orange-50',
};

const DEFAULTS: Record<string, any> = {
  talk_ratio: '40:60', learning_approach: 'student-centric',
  collaboration_mode: 'small-groups', blooms_level: 'apply',
  learning_style: 'mixed', real_world_connection: 'strong',
  differentiation: 'two-tiers', technology_use: 'both',
  skills_21c: ['critical-thinking', 'collaboration'],
  learning_type: 'activity-based', art_integration: false,
  art_type: '', hots: true, formative_assessment: 'exit-ticket',
  questioning_technique: 'probing', inclusion_level: 'two-tiers', tlm_type: 'both',
};

interface Props { user: any; }

export default function TeachingStylePage({ user }: Props) {
  const [profile, setProfile] = useState<any>({ ...DEFAULTS });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    axios.get(`${API}/lesson-plans/profile/${user.id}`)
      .then(r => { if (r.data) setProfile({ ...DEFAULTS, ...r.data }); })
      .catch(() => {});
  }, [user?.id]);

  function setVal(key: string, val: any) {
    setProfile((p: any) => ({ ...p, [key]: val }));
    setSaved(false);
  }

  function toggleSkill(v: string) {
    const cur: string[] = profile.skills_21c || [];
    setVal('skills_21c', cur.includes(v) ? cur.filter(s => s !== v) : [...cur, v]);
  }

  async function save() {
    setLoading(true);
    try {
      await axios.post(`${API}/lesson-plans/profile/${user.id}`, profile);
      setSaved(true);
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-800">My Teaching Style Profile</h2>
          <p className="text-xs text-gray-500 mt-0.5">Set your default pedagogical preferences. These will be used when AI generates lesson plans. You can override per lesson.</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-600 font-medium">Saved!</span>}
          <button onClick={save} disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 disabled:opacity-50 font-medium">
            {loading ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>

      {GROUPS.map(group => (
        <div key={group} className={`border rounded-lg p-4 space-y-4 ${GROUP_COLOR[group]}`}>
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">{group}</h3>
          {PARAMS.filter(p => p.group === group).map(param => (
            <div key={param.key}>
              <label className="block text-xs font-medium text-gray-700 mb-1">{param.label}</label>
              <div className="flex flex-wrap gap-2">
                {param.options.map(opt => (
                  <button key={opt.v} onClick={() => setVal(param.key, opt.v)}
                    className={`px-3 py-1 rounded text-xs border transition-all ${
                      profile[param.key] === opt.v
                        ? 'bg-indigo-600 text-white border-indigo-600 font-medium'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                    }`}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Special: 21C Skills (multi-select) — in CBSE group */}
          {group === 'CBSE' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">21st Century Skills Focus (select 1–2)</label>
              <div className="flex flex-wrap gap-2">
                {SKILLS_OPTIONS.map(opt => (
                  <button key={opt.v} onClick={() => toggleSkill(opt.v)}
                    className={`px-3 py-1 rounded text-xs border transition-all ${
                      (profile.skills_21c || []).includes(opt.v)
                        ? 'bg-indigo-600 text-white border-indigo-600 font-medium'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                    }`}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Special: Art Integration — in CBSE group */}
          {group === 'CBSE' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Art Integration (CBSE mandate)</label>
              <div className="flex gap-2 items-center flex-wrap">
                {[false, true].map(v => (
                  <button key={String(v)} onClick={() => setVal('art_integration', v)}
                    className={`px-3 py-1 rounded text-xs border ${profile.art_integration === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}>
                    {v ? 'Yes' : 'No'}
                  </button>
                ))}
                {profile.art_integration && (
                  <select className="border rounded px-2 py-1 text-xs bg-white"
                    value={profile.art_type || ''} onChange={e => setVal('art_type', e.target.value)}>
                    <option value="">Select art type…</option>
                    <option value="visual-arts">Visual Arts</option>
                    <option value="performing-arts">Performing Arts</option>
                    <option value="literary-arts">Literary Arts</option>
                    <option value="craft">Craft</option>
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Special: HOTS — in CBSE group */}
          {group === 'CBSE' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">HOTS — Higher Order Thinking Skills</label>
              <div className="flex gap-2">
                {[true, false].map(v => (
                  <button key={String(v)} onClick={() => setVal('hots', v)}
                    className={`px-3 py-1 rounded text-xs border ${profile.hots === v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}>
                    {v ? 'Yes — include HOTS questions' : 'No'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      <div className="flex justify-end pb-8">
        <button onClick={save} disabled={loading}
          className="px-6 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50 font-medium">
          {loading ? 'Saving…' : 'Save Teaching Profile'}
        </button>
      </div>
    </div>
  );
}
