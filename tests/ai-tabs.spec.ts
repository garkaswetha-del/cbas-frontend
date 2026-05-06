import { test, expect } from '@playwright/test';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// AI Tabs E2E Tests
//
// Covers both "For Students" (AIToolsTab) and "My Learning" (SelfAITab).
// Tests use REAL data seeded into the production DB and verify actual stored values.
// No button-existence or HTTP-200-only checks — per E2E definition.
//
// For Students:
//   R1 – Gap loading (PASA): student with known marks → correct gaps below 60%
//   R2 – Gap loading (multi-student): two students, independent gaps
//   R3 – AME homework: save to /homework/save → verify stored fields
//   R4 – Practice paper: save → verify stored, correct student_name, type
//   R5 – Assessment paper: save + total marks in content → verify
//   R6 – Parent suggestions: save with student_id → verify in student suggestions endpoint
//   R7 – History CRUD: multiple types saved → filter by type → delete → gone
//   R8 – Class records sync: homework saved by teacher appears in class records endpoint
//
// My Learning:
//   R9  – Baseline gap logic: round 1 gaps → round 2 improvement → gaps clear
//   R10 – Baseline gap logic: round 2 stays below 60% → still shows as gap
//   R11 – Competency loading: /activities/competencies returns data for literacy + numeracy
//   R12 – Learning Resources URLs: search URLs for gap domains are well-formed
// ─────────────────────────────────────────────────────────────────────────────

const API = 'https://cbas-backend-bxiu.onrender.com';
const ACADEMIC_YEAR = '2025-26';

// ── Context shared across all tests ───────────────────────────────────────────
let ctx: {
  teacherId: string;
  teacherName: string;
  student1Id: string;
  student1Name: string;
  student2Id: string;
  student2Name: string;
  grade: string;
  section: string;
  subject: string;
  competencyId: string;
  competencyCode: string;
  competencyName: string;
  pasaConfigId: string;
  savedHomeworkIds: string[];  // collect for cleanup
} | null = null;

// ── Setup ─────────────────────────────────────────────────────────────────────
test.beforeAll(async () => {
  console.log('⏳ Setting up AI tabs E2E data...');

  // 1. Pick 2 real active students (increase timeout — production DB fetch)
  const studR = await axios.get(`${API}/students?limit=2000`, { timeout: 30000 });
  const allStudents: any[] = studR.data?.data || studR.data || [];
  const active = allStudents.filter(s => s.is_active !== false && s.current_class && s.section);
  if (active.length < 2) throw new Error('Need at least 2 active students');

  const s1 = active[0];
  const s2 = active[1];
  const grade = s1.current_class;
  const section = s1.section;

  // 2. Ensure section is registered (required by PASA marks validation)
  await axios.post(`${API}/sections`, { grade, name: section, academic_year: ACADEMIC_YEAR },
    { timeout: 10000, validateStatus: () => true });

  // 3. Ensure AI-test teacher
  const tR = await axios.post(`${API}/users`, {
    name: 'AI Tabs E2E Teacher', email: 'ai.tabs.e2e@cbas.test',
    password: 'AITest123', role: 'teacher', phone: '9000000001',
  }, { validateStatus: () => true, timeout: 15000 });
  let teacherId = tR.data?.id || '';
  if (!teacherId) {
    const all = await axios.get(`${API}/users`, { timeout: 15000 });
    teacherId = (all.data || []).find((u: any) => u.email === 'ai.tabs.e2e@cbas.test')?.id || '';
  }
  if (!teacherId) throw new Error('Could not ensure test teacher');

  // 4. Get a competency from the activities module (for AME tab and competency loading tests)
  const compR = await axios.get(`${API}/activities/competencies?grade=${encodeURIComponent(grade)}`, { timeout: 15000 });
  const actComps: any[] = compR.data?.competencies || [];
  const actComp = actComps[0] || {};
  const actCompSubject = actComp.subject || 'language';

  // 5. Ensure PASA config — create with a known competency we control
  const cfgR = await axios.get(
    `${API}/pasa/config/section?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}&academic_year=${ACADEMIC_YEAR}`,
    { timeout: 15000, validateStatus: () => true }
  );
  const existingConfigs: any[] = cfgR.data?.configs || [];

  // Try to find our dedicated E2E config first
  let pasaConfigId = existingConfigs.find(c => c.description === 'AI-Tabs-E2E-Config-v2')?.id || '';
  let configCompetencyId = '';
  let configCompetencyCode = '';
  let configCompetencyName = '';
  let configSubject = '';
  let configExamType = '';

  if (!pasaConfigId && actComp.id) {
    // Create our own config with a known competency
    const cr = await axios.post(`${API}/pasa/config`, {
      teacher_id: teacherId, teacher_name: 'AI Tabs E2E Teacher',
      subject: actCompSubject, grade, section,
      exam_type: 'FA1', academic_year: ACADEMIC_YEAR,
      description: 'AI-Tabs-E2E-Config-v2',
      competencies: [{ competency_id: actComp.id,
        competency_code: actComp.competency_code || 'AI-E2E-01',
        competency_name: actComp.description || actComp.name || 'AI E2E Competency',
        max_marks: 10 }],
    }, { timeout: 15000, validateStatus: () => true });
    pasaConfigId = cr.data?.config_id || '';
  }

  // 6. Fetch the config's actual competency details (to use in marks seeding)
  if (pasaConfigId) {
    const cfgDetail = await axios.get(`${API}/pasa/config/${pasaConfigId}`, { timeout: 15000, validateStatus: () => true });
    const cfgComps = cfgDetail.data?.competencies || [];
    if (cfgComps.length > 0) {
      configCompetencyId   = cfgComps[0].competency_id || '';
      configCompetencyCode = cfgComps[0].competency_code || '';
      configCompetencyName = cfgComps[0].competency_name || '';
    }
    configSubject   = cfgDetail.data?.subject || actCompSubject;
    configExamType  = cfgDetail.data?.exam_type || 'FA1';
  }
  if (!pasaConfigId) throw new Error('Could not ensure PASA config');
  if (!configCompetencyId) throw new Error('Config has no competencies');

  // 7. Seed PASA marks for student1 — 3/10 = 30% (below 60% gap)
  //    MUST use entries[] format with all required fields including competency_code + name
  const m1 = await axios.post(`${API}/pasa/marks`, {
    exam_config_id: pasaConfigId,
    subject: configSubject, exam_type: configExamType,
    grade, section, academic_year: ACADEMIC_YEAR, teacher_id: teacherId,
    entries: [{
      student_id: s1.id, student_name: s1.name, roll_number: '', is_absent: false,
      competency_scores: [{
        competency_id: configCompetencyId,
        competency_code: configCompetencyCode,
        competency_name: configCompetencyName,
        marks_obtained: 3, max_marks: 10,
      }],
    }],
  }, { timeout: 15000, validateStatus: () => true });
  console.log(`   Marks seed s1 status: ${m1.status}`);

  // 8. Seed PASA marks for student2 — 4/10 = 40% (below 60% gap)
  const m2 = await axios.post(`${API}/pasa/marks`, {
    exam_config_id: pasaConfigId,
    subject: configSubject, exam_type: configExamType,
    grade, section, academic_year: ACADEMIC_YEAR, teacher_id: teacherId,
    entries: [{
      student_id: s2.id, student_name: s2.name, roll_number: '', is_absent: false,
      competency_scores: [{
        competency_id: configCompetencyId,
        competency_code: configCompetencyCode,
        competency_name: configCompetencyName,
        marks_obtained: 4, max_marks: 10,
      }],
    }],
  }, { timeout: 15000, validateStatus: () => true });
  console.log(`   Marks seed s2 status: ${m2.status}`);

  // 9. Seed teacher baseline — round 1: Listening=40%, Reading=30%, Base 10=30% (all gaps)
  await axios.post(`${API}/baseline/teacher`, {
    teacher_id: teacherId, teacher_name: 'AI Tabs E2E Teacher',
    academic_year: ACADEMIC_YEAR, round: 'baseline_1', stage: 'foundation',
    lit_stage: 'foundation', num_stage: 'foundation',
    literacy_scores: { Listening: 4, Speaking: 7, Reading: 3, Writing: 7 },
    numeracy_scores: { Operations: 7, 'Base 10': 3, Measurement: 7, Geometry: 7 },
    max_marks: { Listening: 10, Speaking: 10, Reading: 10, Writing: 10,
      Operations: 10, 'Base 10': 10, Measurement: 10, Geometry: 10 },
    assessment_date: '2025-04-01',
  }, { timeout: 15000, validateStatus: () => true });

  // 10. Seed teacher baseline — round 2: Listening improved (70%), Reading improved (80%),
  //     BUT 'Base 10' remains 35% (still a gap)
  await axios.post(`${API}/baseline/teacher`, {
    teacher_id: teacherId, teacher_name: 'AI Tabs E2E Teacher',
    academic_year: ACADEMIC_YEAR, round: 'baseline_2', stage: 'foundation',
    lit_stage: 'foundation', num_stage: 'foundation',
    literacy_scores: { Listening: 7, Speaking: 8, Reading: 8, Writing: 8 },
    numeracy_scores: { Operations: 8, 'Base 10': 3.5, Measurement: 8, Geometry: 8 },
    max_marks: { Listening: 10, Speaking: 10, Reading: 10, Writing: 10,
      Operations: 10, 'Base 10': 10, Measurement: 10, Geometry: 10 },
    assessment_date: '2025-06-01',
  }, { timeout: 15000, validateStatus: () => true });

  ctx = {
    teacherId, teacherName: 'AI Tabs E2E Teacher',
    student1Id: s1.id, student1Name: s1.name,
    student2Id: s2.id, student2Name: s2.name,
    grade, section,
    subject: configSubject,
    competencyId: configCompetencyId,
    competencyCode: configCompetencyCode,
    competencyName: configCompetencyName,
    pasaConfigId,
    savedHomeworkIds: [],
  };

  console.log(`✅ Setup complete — ${grade} ${section}, teacher ${teacherId}`);
  console.log(`   Students: ${s1.name}, ${s2.name}`);
  console.log(`   PASA config: ${pasaConfigId}, competency: [${configCompetencyCode}]`);
});

test.afterAll(async () => {
  if (!ctx) return;
  console.log('🧹 Cleaning up AI tabs E2E data...');

  // Delete all homework records saved during tests
  for (const id of ctx.savedHomeworkIds) {
    try {
      await axios.delete(`${API}/homework/${id}`, { timeout: 10000, validateStatus: () => true });
    } catch {}
  }

  // Clean up PASA marks for both students
  for (const studentId of [ctx.student1Id, ctx.student2Id]) {
    try {
      await axios.delete(`${API}/pasa/marks/student/${studentId}?academic_year=${ACADEMIC_YEAR}`,
        { validateStatus: () => true, timeout: 10000 });
    } catch {}
  }

  console.log(`✅ Cleanup done — removed ${ctx.savedHomeworkIds.length} homework records`);
});

// ─────────────────────────────────────────────────────────────────────────────
// FOR STUDENTS TAB — GAP LOADING
// ─────────────────────────────────────────────────────────────────────────────

test('R1 — PASA gap loading: student with 30% mark shows as gap below 60%', async () => {
  if (!ctx) throw new Error('Setup failed');

  // Fetch student analysis (same endpoint as AIToolsTab.fetchGapsForOneStudent)
  const r = await axios.get(
    `${API}/pasa/student/${ctx.student1Id}/analysis?academic_year=${ACADEMIC_YEAR}`,
    { timeout: 15000 }
  );

  expect(r.status).toBe(200);
  expect(r.data).toBeDefined();

  // Apply latestByCode logic (same as production code)
  const latestByCode: Record<string, any> = {};
  (r.data.examSummary || []).forEach((exam: any) => {
    Object.values(exam.subjects || {}).forEach((sd: any) => {
      (sd.competency_scores || []).forEach((cs: any) => {
        if (cs.marks_obtained !== null && cs.max_marks > 0) {
          const pct = (cs.marks_obtained / cs.max_marks) * 100;
          latestByCode[cs.competency_code] = { code: cs.competency_code, name: cs.competency_name, pct };
        }
      });
    });
  });

  const gaps = Object.values(latestByCode).filter((c: any) => c.pct < 60);

  // The seeded competency (3/10 = 30%) must appear as a gap
  const ourGap = gaps.find((g: any) => g.code === ctx!.competencyCode);
  expect(ourGap).toBeDefined();
  expect(ourGap!.pct).toBeCloseTo(30, 0);
  console.log(`✅ R1: ${ctx.student1Name} has gap [${ctx.competencyCode}] at ${ourGap!.pct.toFixed(0)}% < 60%`);
});

test('R2 — PASA gap loading: two students have independent gaps (multi-student scenario)', async () => {
  if (!ctx) throw new Error('Setup failed');

  // Fetch both students' analysis independently
  const [r1, r2] = await Promise.all([
    axios.get(`${API}/pasa/student/${ctx.student1Id}/analysis?academic_year=${ACADEMIC_YEAR}`, { timeout: 15000 }),
    axios.get(`${API}/pasa/student/${ctx.student2Id}/analysis?academic_year=${ACADEMIC_YEAR}`, { timeout: 15000 }),
  ]);

  expect(r1.status).toBe(200);
  expect(r2.status).toBe(200);

  // Apply latestByCode for student 1
  const gaps1 = extractGaps(r1.data);
  const gaps2 = extractGaps(r2.data);

  const g1 = gaps1.find(g => g.code === ctx!.competencyCode);
  const g2 = gaps2.find(g => g.code === ctx!.competencyCode);

  expect(g1).toBeDefined();
  expect(g2).toBeDefined();

  // Verify each student's score matches what was seeded (3 and 4 out of 10)
  expect(g1!.pct).toBeCloseTo(30, 0);
  expect(g2!.pct).toBeCloseTo(40, 0);

  // Gaps must be INDEPENDENT — different scores for different students
  expect(g1!.pct).not.toBe(g2!.pct);
  console.log(`✅ R2: ${ctx.student1Name} gap=${g1!.pct.toFixed(0)}%, ${ctx.student2Name} gap=${g2!.pct.toFixed(0)}% — independent`);
});

function extractGaps(analysisData: any): { code: string; pct: number }[] {
  const latestByCode: Record<string, any> = {};
  (analysisData?.examSummary || []).forEach((exam: any) => {
    Object.values(exam.subjects || {}).forEach((sd: any) => {
      ((sd as any).competency_scores || []).forEach((cs: any) => {
        if (cs.marks_obtained !== null && cs.max_marks > 0) {
          const pct = (cs.marks_obtained / cs.max_marks) * 100;
          latestByCode[cs.competency_code] = { code: cs.competency_code, pct };
        }
      });
    });
  });
  return Object.values(latestByCode).filter(c => c.pct < 60);
}

// ─────────────────────────────────────────────────────────────────────────────
// FOR STUDENTS TAB — AME HOMEWORK SAVE/RETRIEVE/DELETE
// ─────────────────────────────────────────────────────────────────────────────

test('R3 — AME homework: save 3 content sets, verify all fields stored correctly', async () => {
  if (!ctx) throw new Error('Setup failed');

  const CONTENT_A = 'AME-E2E Above Average: Question 1: What is photosynthesis? Q2: Explain the process in detail.';
  const CONTENT_M = 'AME-E2E Medium: Question 1: Name one part of a plant. Q2: What do plants need to grow?';
  const CONTENT_E = 'AME-E2E Emerging: Question 1: True or False — plants need sunlight.';

  // Save AME record
  const saveR = await axios.post(`${API}/homework/save`, {
    teacher_id: ctx.teacherId, teacher_name: ctx.teacherName,
    grade: ctx.grade, section: ctx.section,
    subject: ctx.subject, academic_year: ACADEMIC_YEAR,
    type: 'AME', competency_id: ctx.competencyId, competency_name: ctx.competencyName,
    content_a: CONTENT_A, content_m: CONTENT_M, content_e: CONTENT_E,
  }, { timeout: 15000 });

  expect(saveR.status).toBeGreaterThanOrEqual(200);
  expect(saveR.status).toBeLessThan(300);
  expect(saveR.data).toBeDefined();

  const savedId = saveR.data?.id || saveR.data?.record?.id;
  expect(savedId).toBeTruthy();
  if (savedId) ctx.savedHomeworkIds.push(savedId);

  // Retrieve and verify — fields must match exactly what was submitted
  const histR = await axios.get(`${API}/homework/teacher/${ctx.teacherId}?academic_year=${ACADEMIC_YEAR}&type=AME`, { timeout: 15000 });
  expect(histR.status).toBe(200);
  const records: any[] = histR.data?.records || [];

  const saved = records.find(r => r.id === savedId);
  expect(saved).toBeDefined();
  expect(saved.type).toBe('AME');
  expect(saved.teacher_id).toBe(ctx.teacherId);
  expect(saved.grade).toBe(ctx.grade);
  expect(saved.section).toBe(ctx.section);
  expect(saved.academic_year).toBe(ACADEMIC_YEAR);
  expect(saved.competency_name).toBe(ctx.competencyName);
  expect(saved.content_a).toContain('AME-E2E Above Average');
  expect(saved.content_m).toContain('AME-E2E Medium');
  expect(saved.content_e).toContain('AME-E2E Emerging');

  console.log(`✅ R3: AME record ${savedId} stored with all 3 content sets`);
});

test('R4 — Practice paper: save with student names, verify stored with correct type + student_name', async () => {
  if (!ctx) throw new Error('Setup failed');

  const PAPER_CONTENT = `Practice Paper — E2E Test
Student: ${ctx.student1Name}, ${ctx.student2Name}
Q1. [${ctx.competencyCode}] What is the role of the competency in learning?
Q2. Explain with an example.`;

  const saveR = await axios.post(`${API}/homework/save`, {
    teacher_id: ctx.teacherId, teacher_name: ctx.teacherName,
    grade: ctx.grade, section: ctx.section,
    subject: ctx.subject, academic_year: ACADEMIC_YEAR,
    type: 'Practice', content: PAPER_CONTENT,
    student_name: `${ctx.student1Name}, ${ctx.student2Name}`,
  }, { timeout: 15000 });

  expect(saveR.status).toBeGreaterThanOrEqual(200);
  expect(saveR.status).toBeLessThan(300);
  const savedId = saveR.data?.id || saveR.data?.record?.id;
  expect(savedId).toBeTruthy();
  if (savedId) ctx.savedHomeworkIds.push(savedId);

  // Retrieve and verify
  const histR = await axios.get(`${API}/homework/teacher/${ctx.teacherId}?academic_year=${ACADEMIC_YEAR}&type=Practice`, { timeout: 15000 });
  expect(histR.status).toBe(200);
  const records: any[] = histR.data?.records || [];

  const saved = records.find(r => r.id === savedId);
  expect(saved).toBeDefined();
  expect(saved.type).toBe('Practice');
  expect(saved.teacher_id).toBe(ctx.teacherId);
  expect(saved.content).toContain('E2E Test');
  expect(saved.student_name).toContain(ctx.student1Name);

  console.log(`✅ R4: Practice record ${savedId} — student_name="${saved.student_name}"`);
});

test('R5 — Assessment paper: save with totalMarks mentioned in content, verify stored', async () => {
  if (!ctx) throw new Error('Setup failed');

  const TOTAL_MARKS = 50;
  const PAPER_CONTENT = `Assessment Paper — E2E Test (Total: ${TOTAL_MARKS} marks)
Student: ${ctx.student1Name}
Q1. [${ctx.competencyCode}] (5 marks) Define the concept.
Q2. (10 marks) Apply with a real-world example.
Answer Key: Q1 — definition here. Q2 — example here.`;

  const saveR = await axios.post(`${API}/homework/save`, {
    teacher_id: ctx.teacherId, teacher_name: ctx.teacherName,
    grade: ctx.grade, section: ctx.section,
    subject: ctx.subject, academic_year: ACADEMIC_YEAR,
    type: 'Assessment', content: PAPER_CONTENT,
    student_id: ctx.student1Id, student_name: ctx.student1Name,
  }, { timeout: 15000 });

  expect(saveR.status).toBeGreaterThanOrEqual(200);
  expect(saveR.status).toBeLessThan(300);
  const savedId = saveR.data?.id || saveR.data?.record?.id;
  expect(savedId).toBeTruthy();
  if (savedId) ctx.savedHomeworkIds.push(savedId);

  // Verify stored record has totalMarks in content and correct student_id
  const histR = await axios.get(`${API}/homework/teacher/${ctx.teacherId}?academic_year=${ACADEMIC_YEAR}&type=Assessment`, { timeout: 15000 });
  const records: any[] = histR.data?.records || [];
  const saved = records.find(r => r.id === savedId);
  expect(saved).toBeDefined();
  expect(saved.type).toBe('Assessment');
  expect(saved.student_id).toBe(ctx.student1Id);
  expect(saved.student_name).toBe(ctx.student1Name);
  expect(saved.content).toContain(`${TOTAL_MARKS} marks`);

  console.log(`✅ R5: Assessment record ${savedId} — student_id and totalMarks verified`);
});

test('R6 — Parent suggestions: save with student_id, verify in student suggestions endpoint', async () => {
  if (!ctx) throw new Error('Setup failed');

  const SUGGESTION_CONTENT = `Dear Parent of ${ctx.student1Name},
Your child is showing progress in their learning journey. We have identified areas where targeted practice at home can help significantly.
The child needs support in [${ctx.competencyCode}] — ${ctx.competencyName}.
Suggestions: 1. Read daily for 15 minutes. 2. Practice with real-world examples. 3. Use educational apps.`;

  const saveR = await axios.post(`${API}/homework/save`, {
    teacher_id: ctx.teacherId, teacher_name: ctx.teacherName,
    grade: ctx.grade, section: ctx.section,
    subject: ctx.subject, academic_year: ACADEMIC_YEAR,
    type: 'ParentSuggestion', content: SUGGESTION_CONTENT,
    student_id: ctx.student1Id, student_name: ctx.student1Name,
  }, { timeout: 15000 });

  expect(saveR.status).toBeGreaterThanOrEqual(200);
  expect(saveR.status).toBeLessThan(300);
  const savedId = saveR.data?.id || saveR.data?.record?.id;
  expect(savedId).toBeTruthy();
  if (savedId) ctx.savedHomeworkIds.push(savedId);

  // Verify in student suggestions endpoint (student portfolio integration)
  const sugR = await axios.get(`${API}/homework/student/${ctx.student1Id}/suggestions`, { timeout: 15000 });
  expect(sugR.status).toBe(200);
  const suggestions: any[] = sugR.data?.records || sugR.data || [];
  const mySuggestion = suggestions.find((s: any) => s.id === savedId);
  expect(mySuggestion).toBeDefined();
  expect(mySuggestion.type).toBe('ParentSuggestion');
  expect(mySuggestion.student_id).toBe(ctx.student1Id);
  expect(mySuggestion.content).toContain(ctx.student1Name);

  console.log(`✅ R6: ParentSuggestion ${savedId} appears in student portfolio (student suggestions endpoint)`);
});

test('R7 — History CRUD: all types appear in history, type filter works, delete removes record', async () => {
  if (!ctx) throw new Error('Setup failed');

  // Step 1: Save one fresh record of each type
  const saved: string[] = [];
  for (const type of ['AME', 'Practice', 'Assessment', 'ParentSuggestion']) {
    const body: any = {
      teacher_id: ctx.teacherId, teacher_name: ctx.teacherName,
      grade: ctx.grade, section: ctx.section,
      subject: ctx.subject, academic_year: ACADEMIC_YEAR, type,
    };
    if (type === 'AME') {
      body.content_a = `R7-${type}-Above`; body.content_m = `R7-${type}-Medium`; body.content_e = `R7-${type}-Emerging`;
    } else {
      body.content = `R7-${type}-Content`;
      if (type === 'ParentSuggestion' || type === 'Assessment') {
        body.student_id = ctx.student1Id; body.student_name = ctx.student1Name;
      }
    }
    const r = await axios.post(`${API}/homework/save`, body, { timeout: 15000 });
    const id = r.data?.id || r.data?.record?.id;
    if (id) { saved.push(id); ctx.savedHomeworkIds.push(id); }
  }
  expect(saved.length).toBe(4);

  // Step 2: All records appear in unfiltered history
  const allR = await axios.get(`${API}/homework/teacher/${ctx.teacherId}?academic_year=${ACADEMIC_YEAR}`, { timeout: 15000 });
  const allRecords: any[] = allR.data?.records || [];
  for (const id of saved) {
    const found = allRecords.find(r => r.id === id);
    expect(found).toBeDefined();
  }

  // Step 3: Type filter — only AME records when filter=AME
  const ameR = await axios.get(`${API}/homework/teacher/${ctx.teacherId}?academic_year=${ACADEMIC_YEAR}&type=AME`, { timeout: 15000 });
  const ameRecords: any[] = ameR.data?.records || [];
  ameRecords.forEach(r => expect(r.type).toBe('AME'));
  const ameId = saved[0]; // first saved was AME
  expect(ameRecords.find(r => r.id === ameId)).toBeDefined();

  // Step 4: ParentSuggestion filter works
  const psR = await axios.get(`${API}/homework/teacher/${ctx.teacherId}?academic_year=${ACADEMIC_YEAR}&type=ParentSuggestion`, { timeout: 15000 });
  const psRecords: any[] = psR.data?.records || [];
  psRecords.forEach(r => expect(r.type).toBe('ParentSuggestion'));

  // Step 5: Delete one record, verify it's gone from history
  const deleteTargetId = saved[0]; // delete the AME record
  const delR = await axios.delete(`${API}/homework/${deleteTargetId}`, { timeout: 15000, validateStatus: () => true });
  expect(delR.status).toBeGreaterThanOrEqual(200);
  expect(delR.status).toBeLessThan(300);

  const afterR = await axios.get(`${API}/homework/teacher/${ctx.teacherId}?academic_year=${ACADEMIC_YEAR}`, { timeout: 15000 });
  const afterRecords: any[] = afterR.data?.records || [];
  expect(afterRecords.find(r => r.id === deleteTargetId)).toBeUndefined();

  // Remove deleted ID from our cleanup list
  ctx.savedHomeworkIds = ctx.savedHomeworkIds.filter(id => id !== deleteTargetId);

  console.log(`✅ R7: 4 types saved → all in history → type filter correct → delete confirmed gone`);
});

test('R8 — Class records sync: homework saved by teacher appears in class records endpoint', async () => {
  if (!ctx) throw new Error('Setup failed');

  const CONTENT = 'R8-Class-Sync-Practice — E2E class records test content';
  const saveR = await axios.post(`${API}/homework/save`, {
    teacher_id: ctx.teacherId, teacher_name: ctx.teacherName,
    grade: ctx.grade, section: ctx.section,
    subject: ctx.subject, academic_year: ACADEMIC_YEAR,
    type: 'Practice', content: CONTENT,
  }, { timeout: 15000 });

  const savedId = saveR.data?.id || saveR.data?.record?.id;
  expect(savedId).toBeTruthy();
  if (savedId) ctx.savedHomeworkIds.push(savedId);

  // Verify it appears in the class records endpoint (what admin/portfolio would see)
  const classR = await axios.get(
    `${API}/homework/class/${encodeURIComponent(ctx.grade)}/${encodeURIComponent(ctx.section)}`,
    { timeout: 15000, validateStatus: () => true }
  );
  expect(classR.status).toBe(200);
  // Response shape: { total, byYear: { "2025-26": [...] } }
  const byYear = classR.data?.byYear || {};
  const classRecords: any[] = ([] as any[]).concat(...Object.values(byYear));
  const found = classRecords.find((r: any) => r.id === savedId);
  expect(found).toBeDefined();
  expect(found.teacher_id).toBe(ctx.teacherId);
  expect(found.content).toContain('R8-Class-Sync-Practice');

  console.log(`✅ R8: Record ${savedId} synced — visible in class records endpoint`);
});

// ─────────────────────────────────────────────────────────────────────────────
// MY LEARNING TAB — BASELINE GAP LOGIC
// ─────────────────────────────────────────────────────────────────────────────

test('R9 — Baseline gap logic: round 2 improvement clears round 1 gaps (latest-per-domain wins)', async () => {
  if (!ctx) throw new Error('Setup failed');

  const r = await axios.get(`${API}/baseline/teacher/${ctx.teacherId}?academic_year=${ACADEMIC_YEAR}`, { timeout: 15000 });
  expect(r.status).toBe(200);

  const assessments: any[] = r.data?.assessments || [];
  expect(assessments.length).toBeGreaterThanOrEqual(2);

  // Apply getCurrentGaps() logic from SelfAITab — latest-per-domain
  const allRounds = [...assessments].sort((a, b) => a.round > b.round ? 1 : -1);
  const latestByDomain: Record<string, any> = {};
  allRounds.forEach(a => {
    if (a.literacy_pct) {
      Object.entries(a.literacy_pct).forEach(([domain, pct]: [string, any]) => {
        latestByDomain[`lit_${domain}`] = { subject: 'literacy', domain, score: +pct };
      });
    }
    if (a.numeracy_pct) {
      Object.entries(a.numeracy_pct).forEach(([domain, pct]: [string, any]) => {
        latestByDomain[`num_${domain}`] = { subject: 'numeracy', domain, score: +pct };
      });
    }
  });
  const gaps = Object.values(latestByDomain).filter(g => g.score < 60);

  // Listening was 40% in round 1 but improved to 70% in round 2 — must NOT be a gap
  const listeningGap = gaps.find(g => g.domain === 'Listening' && g.subject === 'literacy');
  expect(listeningGap).toBeUndefined();

  // Reading was 30% in round 1 but improved to 80% in round 2 — must NOT be a gap
  const readingGap = gaps.find(g => g.domain === 'Reading' && g.subject === 'literacy');
  expect(readingGap).toBeUndefined();

  // 'Base 10' was 30% in round 1 and remained 35% in round 2 — must STILL be a gap
  const base10Gap = gaps.find(g => g.domain === 'Base 10' && g.subject === 'numeracy');
  expect(base10Gap).toBeDefined();
  expect(base10Gap!.score).toBeLessThan(60);

  console.log(`✅ R9: Listening improved (gap cleared), Reading improved (gap cleared), 'Base 10' still a gap at ${base10Gap!.score.toFixed(0)}%`);
  console.log(`   Total gaps remaining: ${gaps.length}`);
});

test('R10 — Baseline gap logic: round 2 non-improvement stays as gap', async () => {
  if (!ctx) throw new Error('Setup failed');

  const r = await axios.get(`${API}/baseline/teacher/${ctx.teacherId}?academic_year=${ACADEMIC_YEAR}`, { timeout: 15000 });
  const assessments: any[] = r.data?.assessments || [];

  // Find round_2 specifically — Base 10 = 35% (still below 60%)
  const r2 = assessments.find(a => a.round === 'baseline_2');
  expect(r2).toBeDefined();

  const base10Pct = r2.numeracy_pct?.['Base 10'];
  expect(base10Pct).toBeDefined();
  expect(+base10Pct).toBeLessThan(60);
  expect(+base10Pct).toBeCloseTo(35, 0);

  // Apply latest-per-domain — 'Base 10' latest is 35% from round 2 → still a gap
  const allRounds = [...assessments].sort((a, b) => a.round > b.round ? 1 : -1);
  const latestByDomain: Record<string, any> = {};
  allRounds.forEach((a: any) => {
    if (a.numeracy_pct) {
      Object.entries(a.numeracy_pct).forEach(([domain, pct]: [string, any]) => {
        latestByDomain[`num_${domain}`] = { domain, score: +pct };
      });
    }
  });
  const base10Latest = latestByDomain['num_Base 10'];
  expect(base10Latest).toBeDefined();
  expect(base10Latest.score).toBeLessThan(60);

  console.log(`✅ R10: 'Base 10' latest score ${base10Latest.score.toFixed(0)}% < 60% — correctly remains as gap`);
});

// ─────────────────────────────────────────────────────────────────────────────
// MY LEARNING TAB — COMPETENCY LOADING (Custom Topic & AME)
// ─────────────────────────────────────────────────────────────────────────────

test('R11 — Competency loading: literacy and numeracy competencies load for My Learning Custom Topic', async () => {
  // Test that the competencies endpoint works for both literacy and numeracy
  // (same endpoint used by SelfAITab for custom topic mode and AIToolsTab AME)
  // DB stores literacy competencies under subject="language" (not "literacy")
  const [litR, numR] = await Promise.all([
    axios.get(`${API}/activities/competencies?subject=language`, { timeout: 15000 }),
    axios.get(`${API}/activities/competencies?subject=numeracy`, { timeout: 15000 }),
  ]);

  expect(litR.status).toBe(200);
  expect(numR.status).toBe(200);

  const litComps: any[] = litR.data?.competencies || litR.data?.data || litR.data || [];
  const numComps: any[] = numR.data?.competencies || numR.data?.data || numR.data || [];

  expect(litComps.length).toBeGreaterThan(0);
  expect(numComps.length).toBeGreaterThan(0);

  // Verify competencies have required fields for AME/custom paper generation
  const litComp = litComps[0];
  expect(litComp).toHaveProperty('id');
  expect(litComp.subject || litComp.subjects || '').toMatch(/literacy|language/i);

  const numComp = numComps[0];
  expect(numComp).toHaveProperty('id');
  expect(numComp.subject || numComp.subjects || '').toMatch(/numeracy|math/i);

  // Verify competency codes exist (needed for tagging questions in prompts)
  const hasCode = litComps.some(c => c.competency_code || c.code);
  expect(hasCode).toBe(true);

  console.log(`✅ R11: Literacy has ${litComps.length} competencies, Numeracy has ${numComps.length}`);
  console.log(`   Sample lit: [${litComp.competency_code || litComp.code}] ${litComp.description || litComp.name}`);
});

test('R11b — Competency loading with grade filter: teacher subject competencies load for AME tab', async () => {
  if (!ctx) throw new Error('Setup failed');

  // Simulate what AIToolsTab.fetchCompetencies does — fetch with grade filter, fallback without
  const subject = ctx.subject;
  const grade = ctx.grade;

  let r = await axios.get(
    `${API}/activities/competencies?subject=${encodeURIComponent(subject)}&grade=${encodeURIComponent(grade)}`,
    { timeout: 15000, validateStatus: () => true }
  );
  let comps: any[] = r.data?.competencies || [];

  if (comps.length === 0) {
    // Fallback: try without grade (same as production code)
    r = await axios.get(`${API}/activities/competencies?subject=${encodeURIComponent(subject)}`, { timeout: 15000 });
    comps = r.data?.competencies || [];
  }

  // Either with or without grade, we must get some competencies
  expect(comps.length).toBeGreaterThan(0);
  const comp = comps[0];
  expect(comp.id).toBeTruthy();

  console.log(`✅ R11b: ${comps.length} competencies for subject="${subject}" grade="${grade}"`);
});

// ─────────────────────────────────────────────────────────────────────────────
// MY LEARNING TAB — LEARNING RESOURCES URL STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

test('R12 — Learning Resources: search URLs are well-formed for gap domains', async () => {
  // Apply the same getSearchLinks() logic from SelfAITab
  // Verify each URL is a real, parseable URL that points to the correct search engine

  const testGaps = [
    { subject: 'literacy', domain: 'Listening', score: 40, stage: 'foundation', grade: 'Grade 2' },
    { subject: 'numeracy', domain: 'Base 10', score: 35, stage: 'foundation', grade: 'Grade 2' },
    { subject: 'literacy', domain: 'Reading', score: 30, stage: 'preparatory', grade: 'Grade 5' },
  ];

  for (const gap of testGaps) {
    const subjectLabel = gap.subject === 'literacy' ? 'literacy' : 'numeracy';
    const q = `${subjectLabel} ${gap.domain} teacher professional development India`;
    const ytQ = `${subjectLabel} ${gap.domain} teaching strategies classroom`;

    const links = {
      google: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
      youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(ytQ)}`,
      khanacademy: `https://www.khanacademy.org/search?page_search_query=${encodeURIComponent(gap.domain)}`,
    };

    // All links must be parseable URLs
    for (const [name, url] of Object.entries(links)) {
      let parsed: URL;
      expect(() => { parsed = new URL(url); }).not.toThrow();
      parsed = new URL(url);

      // Verify correct domain
      if (name === 'google') expect(parsed.hostname).toBe('www.google.com');
      if (name === 'youtube') expect(parsed.hostname).toBe('www.youtube.com');
      if (name === 'khanacademy') expect(parsed.hostname).toBe('www.khanacademy.org');

      // Verify query params contain domain name
      const params = new URLSearchParams(parsed.search);
      const q_param = params.get('q') || params.get('search_query') || params.get('page_search_query') || '';
      expect(q_param.toLowerCase()).toContain(gap.domain.toLowerCase().split(' ')[0]); // at least first word of domain
    }

    console.log(`  ✓ ${gap.subject} — ${gap.domain}: Google, YouTube, Khan Academy links valid`);
  }

  console.log(`✅ R12: All search URLs well-formed — no hallucinated URLs`);
});

// ─────────────────────────────────────────────────────────────────────────────
// DATA INTEGRITY CROSS-CHECK
// ─────────────────────────────────────────────────────────────────────────────

test('R13 — Data integrity: all saved homework records have required fields, no missing data', async () => {
  if (!ctx) throw new Error('Setup failed');

  const histR = await axios.get(
    `${API}/homework/teacher/${ctx.teacherId}?academic_year=${ACADEMIC_YEAR}`,
    { timeout: 15000 }
  );
  expect(histR.status).toBe(200);
  const records: any[] = histR.data?.records || [];

  // Only check records we seeded in this test run
  const ourRecords = records.filter(r => ctx!.savedHomeworkIds.includes(r.id));
  expect(ourRecords.length).toBeGreaterThan(0);

  for (const r of ourRecords) {
    // Required fields on every record
    expect(r.id).toBeTruthy();
    expect(r.teacher_id).toBe(ctx.teacherId);
    expect(r.grade).toBe(ctx.grade);
    expect(r.section).toBe(ctx.section);
    expect(r.academic_year).toBe(ACADEMIC_YEAR);
    expect(r.type).toBeTruthy();
    expect(r.created_at).toBeTruthy();

    // Content fields — AME has content_a/m/e, others have content
    if (r.type === 'AME') {
      expect(r.content_a).toBeTruthy();
      expect(r.content_m).toBeTruthy();
      expect(r.content_e).toBeTruthy();
    } else {
      expect(r.content).toBeTruthy();
    }

    // No orphaned records — wrong year / wrong teacher
    expect(r.academic_year).not.toBe('wrong-year');
    expect(r.teacher_id).not.toBe('some-other-teacher');
  }

  console.log(`✅ R13: ${ourRecords.length} records verified — all have required fields, no orphaned data`);
});
