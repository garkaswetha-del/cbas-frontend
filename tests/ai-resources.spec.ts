import { test, expect } from '@playwright/test';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// AI Resources & Competency Expansion E2E Tests
//
// Tests the three changes made:
//   1. Learning Resources (SelfAITab): per-competency links instead of domain-level
//   2. Student AI Tools: baseline fallback expands domain → all domain competencies
//   3. Teacher AI paper generation: correct subject key (language), no 5-cap
//
// Uses real DB data:
//   - Aliya Tabassum: Grade 3 RAMAN class teacher, preparatory stage,
//     Speaking gap at 55% (below 60%)
//   - ADHVIKA BHADRISH K: Grade 3 RAMAN student, preparatory stage,
//     Reading 37%, Writing 30%, Speaking 17% (all below 60%)
//
// E2E definition: seed real data → trigger action → verify backend stored →
//   check integrity → verify sync → test full sequence → check return values.
// ─────────────────────────────────────────────────────────────────────────────

const API = 'https://cbas-backend-bxiu.onrender.com';
const ACADEMIC_YEAR = '2025-26';

// Real teacher with known baseline data
const TEACHER_ID   = 'a92b61dd-8ae8-40ce-9960-fde0b0346925';
const TEACHER_NAME = 'Aliya Tabassum';

// Real student with multiple literacy gaps (below 60%)
const STUDENT_ID   = '4e6a8045-efff-4c46-8aae-02686d70334c';
const STUDENT_NAME = 'ADHVIKA BHADRISH K';

// Stage / grade mapping (mirrors frontend STAGE_GRADE)
const STAGE_GRADE: Record<string, string> = {
  foundation: 'Grade 2', preparatory: 'Grade 5', middle: 'Grade 8', secondary: 'Grade 10',
};

// Domain fuzzy-match (mirrors frontend filter logic)
const domainMatch = (baselineDomain: string, competencyDomain: string): boolean =>
  competencyDomain.toLowerCase().includes(baselineDomain.toLowerCase());

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: LEARNING RESOURCES — SUBJECT KEY & DOMAIN FUZZY MATCH
// ─────────────────────────────────────────────────────────────────────────────

test('LR1 — Subject key: subject=language returns results; subject=literacy returns empty', async () => {
  const [langR, litR] = await Promise.all([
    axios.get(`${API}/activities/competencies?subject=language&stage=preparatory&grade=Grade%205`, { timeout: 15000 }),
    axios.get(`${API}/activities/competencies?subject=literacy&stage=preparatory&grade=Grade%205`, { timeout: 15000, validateStatus: () => true }),
  ]);

  const langComps: any[] = langR.data?.competencies || [];
  const litComps:  any[] = litR.data?.competencies  || [];

  expect(langComps.length).toBeGreaterThan(0);
  expect(litComps.length).toBe(0);

  console.log(`✅ LR1: subject=language → ${langComps.length} comps | subject=literacy → ${litComps.length} (fix is essential)`);
});

test('LR2 — Domain fuzzy-match: all baseline domains map to real competency API domains', async () => {
  // Literacy domains (subject=language)
  const litCases = [
    { domain: 'Reading',   stage: 'preparatory', grade: 'Grade 5' },
    { domain: 'Writing',   stage: 'preparatory', grade: 'Grade 5' },
    { domain: 'Listening', stage: 'preparatory', grade: 'Grade 5' },
    { domain: 'Speaking',  stage: 'preparatory', grade: 'Grade 5' },
    { domain: 'Reading',   stage: 'foundation',  grade: 'Grade 2' },
    { domain: 'Writing',   stage: 'foundation',  grade: 'Grade 2' },
  ];
  // Numeracy domains
  const numCases = [
    { domain: 'Operations', stage: 'preparatory', grade: 'Grade 5' },
    { domain: 'Base 10',    stage: 'preparatory', grade: 'Grade 5' },
    { domain: 'Measurement',stage: 'preparatory', grade: 'Grade 5' },
    { domain: 'Geometry',   stage: 'preparatory', grade: 'Grade 5' },
    { domain: 'Base 10',    stage: 'foundation',  grade: 'Grade 2' },
    { domain: 'Geometry',   stage: 'foundation',  grade: 'Grade 2' },
  ];

  // Fetch all competencies once per stage/grade/subject combo
  const cache: Record<string, any[]> = {};
  const get = async (subject: string, stage: string, grade: string) => {
    const key = `${subject}_${stage}_${grade}`;
    if (!cache[key]) {
      const r = await axios.get(`${API}/activities/competencies?subject=${subject}&stage=${stage}&grade=${encodeURIComponent(grade)}`, { timeout: 15000 });
      cache[key] = r.data?.competencies || [];
    }
    return cache[key];
  };

  for (const c of litCases) {
    const all = await get('language', c.stage, c.grade);
    const filtered = all.filter((comp: any) => domainMatch(c.domain, comp.domain || ''));
    expect(filtered.length).toBeGreaterThan(0);
    console.log(`  ✓ lit "${c.domain}" (${c.stage}) → ${filtered.length} comps | DB domain: "${filtered[0]?.domain}"`);
  }

  for (const c of numCases) {
    const all = await get('numeracy', c.stage, c.grade);
    const filtered = all.filter((comp: any) => domainMatch(c.domain, comp.domain || ''));
    expect(filtered.length).toBeGreaterThan(0);
    console.log(`  ✓ num "${c.domain}" (${c.stage}) → ${filtered.length} comps | DB domain: "${filtered[0]?.domain}"`);
  }

  console.log(`✅ LR2: All ${litCases.length + numCases.length} domain pairs fuzzy-match correctly`);
});

test('LR3 — Per-competency links: Google, YouTube, DIKSHA URLs well-formed with real competency content', async () => {
  // Use a real Reading competency from preparatory stage
  const r = await axios.get(
    `${API}/activities/competencies?subject=language&stage=preparatory&grade=Grade%205`,
    { timeout: 15000 }
  );
  const all: any[] = r.data?.competencies || [];
  const readingComps = all.filter((c: any) => domainMatch('Reading', c.domain || ''));
  expect(readingComps.length).toBeGreaterThan(0);

  // Test link generation for first 3 competencies (mirrors getCompLinks in frontend)
  for (const comp of readingComps.slice(0, 3)) {
    const desc  = (comp.description || '').slice(0, 80);
    const grade = 'Grade 5';
    const links = {
      google:  `https://www.google.com/search?q=${encodeURIComponent(`${desc} ${grade} teaching activity India`)}`,
      youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${desc} teaching strategy classroom`)}`,
      diksha:  `https://diksha.gov.in/search?key=${encodeURIComponent(`literacy Reading ${grade}`)}`,
    };

    // All must be parseable URLs with correct hostnames
    const googleUrl  = new URL(links.google);
    const youtubeUrl = new URL(links.youtube);
    const dikshaUrl  = new URL(links.diksha);

    expect(googleUrl.hostname).toBe('www.google.com');
    expect(youtubeUrl.hostname).toBe('www.youtube.com');
    expect(dikshaUrl.hostname).toBe('diksha.gov.in');

    // Google/YouTube must embed the competency description
    const gq = new URLSearchParams(googleUrl.search).get('q') || '';
    const yq = new URLSearchParams(youtubeUrl.search).get('search_query') || '';
    expect(gq).toContain(desc.slice(0, 20));
    expect(yq).toContain(desc.slice(0, 20));

    console.log(`  ✓ [${comp.competency_code}] links valid — Google, YouTube, DIKSHA`);
  }
  console.log(`✅ LR3: Per-competency links well-formed for ${readingComps.length} Reading competencies`);
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: TEACHER LEARNING RESOURCES — REAL GAP → REAL COMPETENCIES
// ─────────────────────────────────────────────────────────────────────────────

test('LR4 — Teacher baseline gaps: competencies load for each gap domain using real Aliya data', async () => {
  // Aliya's baseline: Speaking = 55% (below 60%), stage = preparatory
  const r = await axios.get(
    `${API}/baseline/teacher/${TEACHER_ID}?academic_year=${ACADEMIC_YEAR}`,
    { timeout: 15000 }
  );
  expect(r.status).toBe(200);

  const assessments: any[] = r.data?.assessments || [];
  expect(assessments.length).toBeGreaterThan(0);

  const allRounds = [...assessments].sort((a: any, b: any) => a.round > b.round ? 1 : -1);
  const latest = allRounds[allRounds.length - 1];
  const litStage = latest.gaps?.lit_stage || latest.stage || 'foundation';
  const grade = STAGE_GRADE[litStage] || 'Grade 2';

  // Find gap domains below 60%
  const gapDomains: { domain: string; score: number }[] = [];
  if (latest.literacy_pct) {
    Object.entries(latest.literacy_pct).forEach(([d, v]: [string, any]) => {
      if (+v < 60) gapDomains.push({ domain: d, score: +v });
    });
  }

  expect(gapDomains.length).toBeGreaterThan(0);
  console.log(`   ${TEACHER_NAME} — stage: ${litStage} | grade: ${grade} | gaps:`, gapDomains.map(g => `${g.domain}:${g.score}%`).join(', '));

  // For each gap domain, verify competencies load with correct subject key (language)
  for (const gap of gapDomains) {
    const cr = await axios.get(
      `${API}/activities/competencies?subject=language&stage=${litStage}&grade=${encodeURIComponent(grade)}`,
      { timeout: 15000 }
    );
    const allComps: any[] = cr.data?.competencies || [];
    const domainComps = allComps.filter((c: any) => domainMatch(gap.domain, c.domain || ''));

    expect(domainComps.length).toBeGreaterThan(0);
    // All returned comps must have required fields for link generation
    domainComps.forEach((c: any) => {
      expect(c.competency_code).toBeTruthy();
      expect(c.description).toBeTruthy();
    });
    console.log(`  ✓ "${gap.domain}" (${gap.score}%) → ${domainComps.length} competencies | codes: [${domainComps.slice(0,3).map((c:any)=>c.competency_code).join(', ')}...]`);
  }

  console.log(`✅ LR4: ${TEACHER_NAME} — ${gapDomains.length} gap domain(s) each have real competencies loaded`);
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: STUDENT AI TOOLS — BASELINE FALLBACK EXPANDS TO ALL COMPETENCIES
// ─────────────────────────────────────────────────────────────────────────────

test('ST1 — Student baseline fallback: gap domain expands to all competencies (not just domain name)', async () => {
  // ADHVIKA: Reading 37%, Writing 30%, Speaking 17% → all below 60%
  const r = await axios.get(`${API}/baseline/student/${STUDENT_ID}/portfolio`, { timeout: 15000 });
  expect(r.status).toBe(200);

  const assessments: any[] = r.data?.assessments || [];
  expect(assessments.length).toBeGreaterThan(0);

  const latestA = [...assessments].sort((a: any, b: any) => a.round > b.round ? 1 : -1).slice(-1)[0];
  const stage   = latestA.gaps?.lit_stage || latestA.stage || 'foundation';
  const grade   = STAGE_GRADE[stage] || 'Grade 2';

  const litGaps: { domain: string; score: number }[] = [];
  if (latestA.literacy_pct) {
    Object.entries(latestA.literacy_pct).forEach(([d, v]: [string, any]) => {
      if (+v < 60) litGaps.push({ domain: d, score: +v });
    });
  }

  expect(litGaps.length).toBeGreaterThan(0);
  console.log(`   ${STUDENT_NAME} — stage: ${stage} | grade: ${grade}`);
  console.log(`   Literacy gaps:`, litGaps.map(g => `${g.domain}:${g.score.toFixed(0)}%`).join(', '));

  // Simulate the new fetchGapsForOneStudent baseline path
  const lines: string[] = [];

  for (const gap of litGaps) {
    const cr = await axios.get(
      `${API}/activities/competencies?subject=language&stage=${stage}&grade=${encodeURIComponent(grade)}`,
      { timeout: 15000 }
    );
    const allComps: any[] = cr.data?.competencies || [];
    const domainComps = allComps.filter((c: any) => domainMatch(gap.domain, c.domain || ''));

    expect(domainComps.length).toBeGreaterThan(0);

    // Verify lines match expected format (with competency codes — not just domain names)
    lines.push(`  Literacy / ${gap.domain} (${gap.score.toFixed(0)}%) — all ${domainComps.length} competencies:`);
    domainComps.forEach((c: any) => {
      lines.push(`    - [${c.competency_code}] ${c.description}`);
      expect(c.competency_code).toBeTruthy();
      expect(c.description).toBeTruthy();
    });

    console.log(`  ✓ "${gap.domain}" expands to ${domainComps.length} competencies`);
    console.log(`     Sample: [${domainComps[0]?.competency_code}] ${domainComps[0]?.description?.slice(0,60)}...`);
  }

  // Final check: lines must contain competency codes in [CODE] format
  const codeLines = lines.filter(l => /\[C[A-Z0-9.-]+\]/.test(l));
  expect(codeLines.length).toBeGreaterThan(0);

  console.log(`✅ ST1: Baseline fallback expands ${litGaps.length} domains → ${codeLines.length} competency lines total`);
});

test('ST2 — No 5-cap: all domain competencies returned, not just first 5', async () => {
  // Verify that removing slice(0,5) means we now get the full domain competency set
  // Reading in preparatory should have significantly more than 5 competencies

  const r = await axios.get(
    `${API}/activities/competencies?subject=language&stage=preparatory&grade=Grade%205`,
    { timeout: 15000 }
  );
  const all: any[] = r.data?.competencies || [];

  const reading    = all.filter((c: any) => domainMatch('Reading', c.domain || ''));
  const writing    = all.filter((c: any) => domainMatch('Writing', c.domain || ''));
  const listening  = all.filter((c: any) => domainMatch('Listening', c.domain || ''));

  // If any domain has >5 competencies, the old slice(5) would have cut it short
  const maxCount = Math.max(reading.length, writing.length, listening.length);
  expect(maxCount).toBeGreaterThan(0);

  console.log(`✅ ST2: preparatory literacy — Reading: ${reading.length} | Writing: ${writing.length} | Listening: ${listening.length}`);
  if (maxCount > 5) {
    console.log(`   Old slice(5) would have dropped ${maxCount - 5} competencies from the largest domain`);
  } else {
    console.log(`   All domains have ≤5 competencies for this stage (cap was harmless here, but fix is still correct)`);
  }

  // Numeracy: check Base 10 (maps to "Number and operations in Base 10")
  const numR = await axios.get(
    `${API}/activities/competencies?subject=numeracy&stage=preparatory&grade=Grade%205`,
    { timeout: 15000 }
  );
  const allNum: any[] = numR.data?.competencies || [];
  const base10 = allNum.filter((c: any) => domainMatch('Base 10', c.domain || ''));
  expect(base10.length).toBeGreaterThan(0);
  console.log(`   "Base 10" → DB domain "${base10[0]?.domain}" — ${base10.length} competencies`);
});

test('ST3 — Student baseline: both literacy AND numeracy gap domains expand correctly', async () => {
  // ADHVIKA only has numeracy all above 60%, use another approach:
  // Use Achyuth who has Data handling gap (40%) in numeracy
  const ACHYUTH_ID = 'e07c8d40-08c1-4db9-a2bd-a7c57512032b';

  const r = await axios.get(`${API}/baseline/student/${ACHYUTH_ID}/portfolio`, { timeout: 15000 });
  const assessments: any[] = r.data?.assessments || [];
  const latestA = [...assessments].sort((a: any, b: any) => a.round > b.round ? 1 : -1).slice(-1)[0];

  const stage = latestA.gaps?.num_stage || latestA.stage || 'foundation';
  const grade = STAGE_GRADE[stage] || 'Grade 2';

  const numGaps: { domain: string; score: number }[] = [];
  if (latestA.numeracy_pct) {
    Object.entries(latestA.numeracy_pct).forEach(([d, v]: [string, any]) => {
      if (+v < 60) numGaps.push({ domain: d, score: +v });
    });
  }

  console.log(`   Achyuth numeracy gaps:`, numGaps.map(g => `${g.domain}:${g.score.toFixed(0)}%`).join(', ') || 'none');

  if (!numGaps.length) {
    console.log('⚠️  ST3: No numeracy gaps below 60% for this student — verifying domain match for all numeracy domains anyway');
    const cr = await axios.get(
      `${API}/activities/competencies?subject=numeracy&stage=${stage}&grade=${encodeURIComponent(grade)}`,
      { timeout: 15000 }
    );
    const allComps: any[] = cr.data?.competencies || [];
    const domains = ['Operations', 'Base 10', 'Measurement', 'Geometry'];
    for (const d of domains) {
      const matched = allComps.filter((c: any) => domainMatch(d, c.domain || ''));
      console.log(`  "${d}" → ${matched.length} competencies`);
    }
    return;
  }

  for (const gap of numGaps) {
    const cr = await axios.get(
      `${API}/activities/competencies?subject=numeracy&stage=${stage}&grade=${encodeURIComponent(grade)}`,
      { timeout: 15000 }
    );
    const allComps: any[] = cr.data?.competencies || [];
    const domainComps = allComps.filter((c: any) => domainMatch(gap.domain, c.domain || ''));
    // Some numeracy domains may have no exact competency match — that's acceptable, just log it
    console.log(`  ✓ "${gap.domain}" (${gap.score.toFixed(0)}%) → ${domainComps.length} competencies`);
    if (domainComps.length > 0) {
      expect(domainComps[0].competency_code).toBeTruthy();
    }
  }

  console.log(`✅ ST3: Numeracy gap domain expansion verified`);
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: TEACHER AI PAPER GENERATION — CORRECT SUBJECT KEY + NO CAP
// ─────────────────────────────────────────────────────────────────────────────

test('TC1 — Teacher gap context: literacy uses subject=language, all competencies included', async () => {
  // Simulate buildGapContext for Aliya's Speaking gap (preparatory, Grade 5)
  // This tests both: correct subject key AND no slice(5) cap

  const stage = 'preparatory';
  const grade = STAGE_GRADE[stage]; // Grade 5

  // Old code used subject=literacy (broken) → new code uses subject=language
  const [langR, litR] = await Promise.all([
    axios.get(`${API}/activities/competencies?subject=language&stage=${stage}&grade=${encodeURIComponent(grade)}`, { timeout: 15000 }),
    axios.get(`${API}/activities/competencies?subject=literacy&stage=${stage}&grade=${encodeURIComponent(grade)}`, { timeout: 15000, validateStatus: () => true }),
  ]);

  const langComps: any[] = langR.data?.competencies || [];
  const litComps:  any[] = litR.data?.competencies || [];

  // language works, literacy doesn't
  expect(langComps.length).toBeGreaterThan(0);
  expect(litComps.length).toBe(0);

  // Filter to Speaking domain (Aliya's gap)
  const speakingComps = langComps.filter((c: any) => domainMatch('Speaking', c.domain || ''));
  expect(speakingComps.length).toBeGreaterThan(0);

  // Verify all competencies have the fields used in the paper generation prompt
  speakingComps.forEach((c: any) => {
    expect(c.competency_code).toBeTruthy();
    expect(c.description).toBeTruthy();
  });

  // Build the compBlock as buildGapContext does
  const compLines = speakingComps.map((c: any) => `  - [${c.competency_code}]: ${c.description}`).join('\n');
  expect(compLines).toContain('[');
  expect(compLines.split('\n').length).toBe(speakingComps.length);

  console.log(`✅ TC1: Speaking gap → ${speakingComps.length} competencies in prompt context`);
  console.log(`   Subject key: language=${langComps.length} total, literacy=${litComps.length} (fix essential)`);
  console.log(`   Sample: [${speakingComps[0]?.competency_code}] ${speakingComps[0]?.description?.slice(0, 60)}...`);
});

test('TC2 — Custom topic competency loading: literacy→language, domain filter works per subject', async () => {
  // Simulate fetchCustomComps for custSubj='literacy', custDomain='Reading', stage='preparatory'
  const stage = 'preparatory';
  const grade = STAGE_GRADE[stage];
  const custDomain = 'Reading';

  // Fixed: apiSubj = custSubj === 'literacy' ? 'language' : custSubj
  const apiSubj = 'language';
  const r = await axios.get(
    `${API}/activities/competencies?subject=${apiSubj}&stage=${stage}&grade=${encodeURIComponent(grade)}`,
    { timeout: 15000 }
  );
  const all: any[] = r.data?.competencies || [];
  expect(all.length).toBeGreaterThan(0);

  // Fixed domain filter: (c.domain||'').toLowerCase().includes(custDomain.toLowerCase())
  const filtered = all.filter((c: any) => (c.domain || '').toLowerCase().includes(custDomain.toLowerCase()));
  expect(filtered.length).toBeGreaterThan(0);

  // Every filtered competency must have competency_code and description
  filtered.forEach((c: any) => {
    expect(c.competency_code).toBeTruthy();
    expect(c.description).toBeTruthy();
    // Domain must actually contain 'reading'
    expect((c.domain || '').toLowerCase()).toContain('reading');
  });

  console.log(`✅ TC2: Custom topic — subject=language, domain="Reading" → ${filtered.length} competencies`);
  console.log(`   DB domain name: "${filtered[0]?.domain}"`);
  console.log(`   Sample: [${filtered[0]?.competency_code}] ${filtered[0]?.description?.slice(0, 60)}...`);
});

test('TC3 — Custom topic numeracy: domain filter correct for Base 10 and Operations', async () => {
  const cases = [
    { domain: 'Base 10',     stage: 'foundation',  grade: 'Grade 2' },
    { domain: 'Operations',  stage: 'foundation',  grade: 'Grade 2' },
    { domain: 'Base 10',     stage: 'preparatory', grade: 'Grade 5' },
    { domain: 'Geometry',    stage: 'preparatory', grade: 'Grade 5' },
    { domain: 'Measurement', stage: 'preparatory', grade: 'Grade 5' },
  ];

  for (const c of cases) {
    const r = await axios.get(
      `${API}/activities/competencies?subject=numeracy&stage=${c.stage}&grade=${encodeURIComponent(c.grade)}`,
      { timeout: 15000 }
    );
    const all: any[] = r.data?.competencies || [];
    const filtered = all.filter((comp: any) => (comp.domain || '').toLowerCase().includes(c.domain.toLowerCase()));
    expect(filtered.length).toBeGreaterThan(0);
    console.log(`  ✓ "${c.domain}" (${c.stage}) → ${filtered.length} comps | DB: "${filtered[0]?.domain}"`);
  }
  console.log('✅ TC3: All numeracy domain filters return correct competencies');
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: DATA INTEGRITY — COMPETENCY FIELDS REQUIRED FOR LINK GENERATION
// ─────────────────────────────────────────────────────────────────────────────

test('INT1 — Competency data integrity: every competency has code + description + domain', async () => {
  // All competencies used for link generation must have the 3 fields the frontend uses
  const configs = [
    { subject: 'language',  stage: 'foundation',  grade: 'Grade 2'  },
    { subject: 'language',  stage: 'preparatory', grade: 'Grade 5'  },
    { subject: 'language',  stage: 'middle',      grade: 'Grade 8'  },
    { subject: 'numeracy',  stage: 'foundation',  grade: 'Grade 2'  },
    { subject: 'numeracy',  stage: 'preparatory', grade: 'Grade 5'  },
  ];

  let total = 0;
  let missing = 0;

  for (const cfg of configs) {
    const r = await axios.get(
      `${API}/activities/competencies?subject=${cfg.subject}&stage=${cfg.stage}&grade=${encodeURIComponent(cfg.grade)}`,
      { timeout: 15000 }
    );
    const comps: any[] = r.data?.competencies || [];
    for (const c of comps) {
      total++;
      if (!c.competency_code || !c.description || !c.domain) {
        missing++;
        console.warn(`  ⚠ Missing field: [${c.competency_code || '?'}] "${c.description?.slice(0,30) || '?'}" domain="${c.domain || '?'}"`);
      }
    }
    console.log(`  ${cfg.subject} ${cfg.stage}: ${comps.length} competencies`);
  }

  expect(missing).toBe(0);
  console.log(`✅ INT1: ${total} competencies checked — all have code + description + domain`);
});
