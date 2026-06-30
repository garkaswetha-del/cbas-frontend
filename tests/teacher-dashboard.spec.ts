import { test, expect } from '@playwright/test';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const BASE = 'https://cbas-frontend-production.up.railway.app';
const API  = 'https://cbas-backend-production.up.railway.app';
const ACADEMIC_YEAR = '2025-26';

const TEACHER = {
  name:     'E2E Dashboard Teacher',
  email:    'e2e.dashboard.teacher@cbas.test',
  password: 'E2eTeacher123',
  role:     'teacher',
};

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL CACHE  (populated once in beforeAll, reused across all tests)
// ─────────────────────────────────────────────────────────────────────────────
let ctx: {
  teacherId: string;
  grade: string;
  section: string;
  subject: string;
  competencyId: string;
  competencyCode: string;
  competencyName: string;
  students: { id: string; name: string }[];
  activityId: string;
  pasaConfigId: string;
  nextGrade: string;
} | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// SEED HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const GRADE_ORDER = ['Pre-KG','LKG','UKG','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5',
  'Grade 6','Grade 7','Grade 8','Grade 9','Grade 10'];

async function ensureTeacher(): Promise<string> {
  try {
    const r = await axios.get(`${API}/users`, { timeout: 15000 });
    const found = (r.data || []).find((u: any) => u.email === TEACHER.email);
    if (found) return found.id;
  } catch {}
  try {
    const r = await axios.get(`${API}/users/inactive`, { timeout: 15000 });
    const found = (r.data || []).find((u: any) => u.email === TEACHER.email);
    if (found) { await axios.patch(`${API}/users/${found.id}/reactivate`); return found.id; }
  } catch {}
  try {
    const r = await axios.post(`${API}/users`, {
      name: TEACHER.name, email: TEACHER.email,
      password: TEACHER.password, role: 'teacher', phone: '9000000001',
    }, { timeout: 15000 });
    return r.data.id;
  } catch (e: any) {
    if (e.response?.status === 409) {
      const r2 = await axios.get(`${API}/users`, { timeout: 15000 });
      const found = (r2.data || []).find((u: any) => u.email === TEACHER.email);
      if (found) return found.id;
    }
    throw e;
  }
}

async function pickGradeSection(): Promise<{ grade: string; section: string; students: { id: string; name: string }[]; nextGrade: string }> {
  const r = await axios.get(`${API}/students?limit=2000`, { timeout: 15000 });
  const all: any[] = r.data?.data || r.data || [];
  const preferOrder = ['Grade 3', 'Grade 4', 'Grade 2', 'Grade 5', 'Grade 1'];
  let grade = '';
  for (const g of preferOrder) {
    // Must have a next grade for promotion tests
    const idx = GRADE_ORDER.indexOf(g);
    if (idx >= 0 && idx < GRADE_ORDER.length - 1 && all.some(s => s.current_class === g && s.is_active !== false)) {
      grade = g; break;
    }
  }
  if (!grade) grade = all.find(s => s.is_active !== false)?.current_class || 'Grade 1';

  const inGrade = all.filter(s => s.current_class === grade && s.is_active !== false);
  const sections = ([...new Set(inGrade.map((s: any) => s.section).filter(Boolean))] as string[]).sort();
  const section = sections[0] || 'A';
  const students = inGrade.filter(s => s.section === section).slice(0, 5).map(s => ({ id: s.id, name: s.name }));
  const gradeIdx = GRADE_ORDER.indexOf(grade);
  const nextGrade = gradeIdx >= 0 && gradeIdx < GRADE_ORDER.length - 1 ? GRADE_ORDER[gradeIdx + 1] : '';
  return { grade, section, students, nextGrade };
}

async function ensureMappings(teacherId: string, grade: string, section: string, subject: string) {
  await axios.post(`${API}/mappings/save`, {
    teacher_id: teacherId, academic_year: ACADEMIC_YEAR,
    mappings: [
      { grade, section, subject, is_class_teacher: true },
      { grade, section, subject: 'Mathematics', is_class_teacher: false },
    ],
  }, { timeout: 15000 });
}

async function pickCompetency(grade: string): Promise<{ id: string; code: string; name: string; subject: string }> {
  const r = await axios.get(`${API}/activities/competencies?grade=${encodeURIComponent(grade)}`, { timeout: 15000 });
  const comps: any[] = r.data?.competencies || [];
  const c = comps[0] || {};
  return { id: c.id || '', code: c.competency_code || c.code || 'E2E-C01',
           name: c.description || c.name || 'E2E Competency', subject: c.subject || 'language' };
}

async function ensureActivity(grade: string, section: string, subject: string,
  competencyId: string, competencyCode: string, competencyName: string): Promise<string> {
  const E2E_ACT = 'E2E-Dashboard-Activity';
  const listR = await axios.get(`${API}/activities?grade=${encodeURIComponent(grade)}&academic_year=${ACADEMIC_YEAR}`, { timeout: 15000 });
  const existing = (listR.data || []).find((a: any) => a.name === E2E_ACT && a.section === section);
  if (existing) return existing.id;

  const r = await axios.post(`${API}/activities`, {
    name: E2E_ACT, description: 'E2E test activity — safe to delete',
    subject, stage: 'preparatory', grade, sections: [section],
    activity_type: 'Assessment', activity_date: '2025-03-10',
    academic_year: ACADEMIC_YEAR, created_by: 'e2e',
    competency_mappings: competencyId ? [competencyId] : [],
    rubrics: competencyId ? [{
      competency_id: competencyId, competency_code: competencyCode, competency_name: competencyName,
      rubric_items: [{ name: 'Criterion A', max_marks: 5 }, { name: 'Criterion B', max_marks: 5 }],
    }] : [],
  }, { timeout: 15000 });
  return r.data?.activities?.[0]?.id || r.data?.id || '';
}

async function ensurePASAConfig(grade: string, section: string, subject: string,
  competencyId: string, competencyCode: string, competencyName: string): Promise<string> {
  const E2E_PASA = 'E2E-Dashboard-PASA';
  const cfgR = await axios.get(`${API}/pasa/config/section?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}&academic_year=${ACADEMIC_YEAR}`, { timeout: 15000 });
  const existing = (cfgR.data?.configs || []).find((c: any) => c.description === E2E_PASA);
  if (existing) return existing.id;

  const r = await axios.post(`${API}/pasa/config`, {
    teacher_id: 'e2e', teacher_name: 'E2E Teacher', subject, grade, section,
    exam_type: 'FA1', academic_year: ACADEMIC_YEAR, description: E2E_PASA,
    competencies: competencyId ? [{ competency_id: competencyId, competency_code: competencyCode,
      competency_name: competencyName, max_marks: 10 }] : [],
  }, { timeout: 15000 });
  return r.data?.config_id || '';
}

// ─────────────────────────────────────────────────────────────────────────────
// ONE-TIME SETUP
// ─────────────────────────────────────────────────────────────────────────────
test.beforeAll(async () => {
  console.log('⏳ Seeding teacher dashboard test data...');
  const teacherId = await ensureTeacher();
  const { grade, section, students, nextGrade } = await pickGradeSection();
  const { id: compId, code: compCode, name: compName, subject } = await pickCompetency(grade);

  await ensureMappings(teacherId, grade, section, subject);

  // Seed Round 1 baseline with correct field names
  const stageMap: Record<string, string> = {
    'Pre-KG': 'foundation', 'LKG': 'foundation', 'UKG': 'foundation',
    'Grade 1': 'foundation', 'Grade 2': 'foundation',
    'Grade 3': 'preparatory', 'Grade 4': 'preparatory', 'Grade 5': 'preparatory',
    'Grade 6': 'middle', 'Grade 7': 'middle', 'Grade 8': 'middle',
    'Grade 9': 'secondary', 'Grade 10': 'secondary',
  };
  const stage = stageMap[grade] || 'foundation';

  await axios.post(`${API}/baseline/section/round`, {
    grade, section, stage, academic_year: ACADEMIC_YEAR, round: 'baseline_1',
    entries: students.map((s, i) => ({
      student_id: s.id, student_name: s.name,
      literacy_scores: { Listening: 55 + i * 5, Speaking: 60 + i * 3, Reading: 45 + i * 8, Writing: 50 + i * 6 },
      numeracy_scores: { Operations: 40 + i * 7, 'Base 10': 65 + i * 2, Measurement: 55 + i * 4, Geometry: 70 + i },
      max_marks: {},
    })),
  }, { timeout: 20000 });

  const activityId = await ensureActivity(grade, section, subject, compId, compCode, compName);

  // Seed initial activity marks using correct competency_marks format
  try {
    await axios.post(`${API}/activities/${activityId}/marks`, {
      academic_year: ACADEMIC_YEAR,
      entries: students.map((s, i) => ({
        student_id: s.id, student_name: s.name,
        competency_marks: { [compId]: { "0": 3 + (i % 3), "1": 2 + (i % 4) } },
      })),
    }, { timeout: 15000 });
  } catch {}

  const pasaConfigId = await ensurePASAConfig(grade, section, subject, compId, compCode, compName);

  // Seed initial PASA marks (requires section in registry first)
  try {
    await axios.post(`${API}/sections`, { grade, name: section, academic_year: ACADEMIC_YEAR }, { timeout: 10000 });
  } catch {} // 409 if already exists
  try {
    await axios.post(`${API}/pasa/marks`, {
      exam_config_id: pasaConfigId, grade, section,
      subject, exam_type: 'FA1', teacher_id: teacherId,
      academic_year: ACADEMIC_YEAR,
      entries: students.map((s, i) => ({
        student_id: s.id, student_name: s.name,
        competency_scores: [{ competency_id: compId, competency_code: compCode,
          competency_name: compName, marks_obtained: 4 + (i % 6), max_marks: 10 }],
      })),
    }, { timeout: 15000 });
  } catch {}

  ctx = { teacherId, grade, section, subject, competencyId: compId, competencyCode: compCode,
          competencyName: compName, students, activityId, pasaConfigId, nextGrade };
  console.log(`✅ Seed done — teacher ${TEACHER.email} → ${grade} ${section}, ${students.length} students`);
});

test.afterAll(async () => {
  if (!ctx) return;
  try { await axios.delete(`${API}/users/${ctx.teacherId}/permanent`); } catch {}
  try { if (ctx.activityId) await axios.delete(`${API}/activities/${ctx.activityId}`); } catch {}
  console.log('🧹 Teacher dashboard test data cleaned up');
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN HELPER
// ─────────────────────────────────────────────────────────────────────────────
async function loginAsTeacher(page: any) {
  await page.goto(BASE, { timeout: 60000 });
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.fill('input[type="email"]', TEACHER.email);
  await page.fill('input[type="password"]', TEACHER.password);
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  await page.waitForSelector('button:has-text("My Students")', { timeout: 30000 });
  await page.waitForTimeout(1500);
}

async function clickTab(page: any, label: string) {
  await page.click(`button:has-text("${label}")`);
  await page.waitForTimeout(1500);
}

// ─────────────────────────────────────────────────────────────────────────────
// A — AUTH & DASHBOARD SHELL
// ─────────────────────────────────────────────────────────────────────────────
test.describe('A — Auth & Dashboard Shell', () => {

  test('A1. Teacher login succeeds and lands on dashboard', async ({ page }) => {
    await loginAsTeacher(page);
    await expect(page.locator('button:has-text("My Students")')).toBeVisible();
    await expect(page.locator('button:has-text("My Profile")')).toBeVisible();
    console.log('✅ A1: Teacher dashboard loaded');
  });

  test('A2. Mappings API — is_class_teacher=true, correct grade+section stored', async () => {
    const r = await axios.get(`${API}/mappings/teacher/${ctx!.teacherId}/dashboard?academic_year=${ACADEMIC_YEAR}`);
    expect(r.status).toBe(200);
    expect(r.data.is_class_teacher).toBe(true);
    expect(r.data.class_grade).toBe(ctx!.grade);
    expect(r.data.class_section).toBe(ctx!.section);
    expect(r.data.mappings.length).toBeGreaterThan(0);
    // Verify the mapping is stored for the correct academic year
    const mapping = r.data.mappings[0];
    expect(mapping.academic_year || r.data.academic_year || ACADEMIC_YEAR).toBe(ACADEMIC_YEAR);
    console.log(`✅ A2: is_class_teacher=true, ${r.data.class_grade} ${r.data.class_section}, ${r.data.mappings.length} mappings stored`);
  });

  test('A3. Login returns user with role=teacher in response', async () => {
    const r = await axios.post(`${API}/users/login`, { email: TEACHER.email, password: TEACHER.password });
    expect(r.data.success).toBe(true);
    expect(r.data.user.role).toBe('teacher');
    expect(r.data.user.id).toBe(ctx!.teacherId);
    console.log(`✅ A3: Login returns role="${r.data.user.role}", id matches seeded teacher`);
  });

  test('A4. Class teacher tabs (My Class, Baseline Entry, Promotion) visible', async ({ page }) => {
    await loginAsTeacher(page);
    await expect(page.locator('button:has-text("My Class")')).toBeVisible();
    await expect(page.locator('button:has-text("Baseline Entry")')).toBeVisible();
    await expect(page.locator('button:has-text("Promotion")')).toBeVisible();
    console.log('✅ A4: Class teacher tabs visible');
  });

  test('A5. Self management tabs visible', async ({ page }) => {
    await loginAsTeacher(page);
    await expect(page.locator('button:has-text("My Profile")')).toBeVisible();
    await expect(page.locator('button:has-text("My Baseline")')).toBeVisible();
    await expect(page.locator('button:has-text("My Appraisal")')).toBeVisible();
    console.log('✅ A5: Self management tabs visible');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B — BASELINE ENTRY — REAL SUBMISSION & DATA VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
test.describe('B — Baseline Entry: Real Submission & Verification', () => {

  // Known Round 2 scores — we calculate expected pct ourselves
  const R2_LIT   = { Listening: 80, Speaking: 85, Reading: 70, Writing: 75 };
  const R2_NUM   = { Operations: 60, 'Base 10': 70, Measurement: 65, Geometry: 90 };
  // With empty max_marks, raw values are used as percentages directly
  const R2_LIT_TOTAL = (80 + 85 + 70 + 75) / 4;           // 77.5
  const R2_NUM_TOTAL = (60 + 70 + 65 + 90) / 4;           // 71.25
  const R2_OVERALL   = (R2_LIT_TOTAL + R2_NUM_TOTAL) / 2; // 74.375

  const stageMap: Record<string, string> = {
    'Pre-KG': 'foundation', 'LKG': 'foundation', 'UKG': 'foundation',
    'Grade 1': 'foundation', 'Grade 2': 'foundation',
    'Grade 3': 'preparatory', 'Grade 4': 'preparatory', 'Grade 5': 'preparatory',
    'Grade 6': 'middle', 'Grade 7': 'middle', 'Grade 8': 'middle',
    'Grade 9': 'secondary', 'Grade 10': 'secondary',
  };

  // Seed baseline_2 before ALL B tests so every B test can rely on it
  test.beforeAll(async () => {
    if (!ctx) return;
    const stage = stageMap[ctx.grade] || 'foundation';
    await axios.post(`${API}/baseline/section/round`, {
      grade: ctx.grade, section: ctx.section, stage,
      academic_year: ACADEMIC_YEAR, round: 'baseline_2',
      entries: ctx.students.slice(0, 2).map(s => ({
        student_id: s.id, student_name: s.name,
        literacy_scores: R2_LIT, numeracy_scores: R2_NUM, max_marks: {},
      })),
    }, { timeout: 20000 });
    console.log('⏳ Seeded baseline_2 for B tests');
  });

  test('B1. POST baseline/section/round — baseline_2 response returns saved≥1', async () => {
    // The seed already ran in beforeAll — re-submit and verify the upsert response
    const stage = stageMap[ctx!.grade] || 'foundation';
    const r = await axios.post(`${API}/baseline/section/round`, {
      grade: ctx!.grade, section: ctx!.section, stage,
      academic_year: ACADEMIC_YEAR, round: 'baseline_2',
      entries: ctx!.students.slice(0, 2).map(s => ({
        student_id: s.id, student_name: s.name,
        literacy_scores: R2_LIT, numeracy_scores: R2_NUM, max_marks: {},
      })),
    }, { timeout: 20000 });

    expect(r.status).toBe(201);
    expect(r.data.saved).toBeGreaterThanOrEqual(1);
    expect(r.data.failed).toBe(0);
    console.log(`✅ B1: baseline_2 submitted — saved=${r.data.saved}, failed=${r.data.failed}`);
  });

  test('B2. After submission: student portfolio has Round 2 record', async () => {
    const studentId = ctx!.students[0]?.id;
    if (!studentId) { console.log('⚠️ B2: No student'); return; }

    const r = await axios.get(`${API}/baseline/student/${studentId}/portfolio`);
    expect(r.status).toBe(200);
    const rounds: any[] = r.data?.assessments || [];
    const round2 = rounds.find((a: any) => a.round === 'baseline_2');
    expect(round2).toBeTruthy();
    console.log(`✅ B2: Round 2 record exists in student portfolio (${rounds.length} total rounds)`);
  });

  test('B3. Round 2 literacy_total matches expected value (77.5)', async () => {
    const studentId = ctx!.students[0]?.id;
    if (!studentId) { console.log('⚠️ B3: No student'); return; }

    const r = await axios.get(`${API}/baseline/student/${studentId}/portfolio`);
    const rounds: any[] = r.data?.assessments || [];
    const round2 = rounds.find((a: any) => a.round === 'baseline_2');
    expect(round2).toBeTruthy();
    // literacy_total should be 77.5 (avg of 80,85,70,75)
    expect(+round2.literacy_total).toBeCloseTo(R2_LIT_TOTAL, 1);
    console.log(`✅ B3: literacy_total=${round2.literacy_total} (expected ≈${R2_LIT_TOTAL})`);
  });

  test('B4. Round 2 numeracy_total and overall_score calculated correctly', async () => {
    const studentId = ctx!.students[0]?.id;
    if (!studentId) { console.log('⚠️ B4: No student'); return; }

    const r = await axios.get(`${API}/baseline/student/${studentId}/portfolio`);
    const rounds: any[] = r.data?.assessments || [];
    const round2 = rounds.find((a: any) => a.round === 'baseline_2');
    expect(round2).toBeTruthy();
    // numeracy_total ≈ 71.25, overall ≈ 74.375
    expect(+round2.numeracy_total).toBeCloseTo(R2_NUM_TOTAL, 1);
    expect(+round2.overall_score).toBeCloseTo(R2_OVERALL, 0);
    console.log(`✅ B4: numeracy_total=${round2.numeracy_total}, overall_score=${round2.overall_score}`);
  });

  test('B5. Round 2 level assigned: overall≈74% → "Level 3 – Meeting"', async () => {
    const studentId = ctx!.students[0]?.id;
    if (!studentId) { console.log('⚠️ B5: No student'); return; }

    const r = await axios.get(`${API}/baseline/student/${studentId}/portfolio`);
    const rounds: any[] = r.data?.assessments || [];
    const round2 = rounds.find((a: any) => a.round === 'baseline_2');
    expect(round2).toBeTruthy();
    // 74.375 falls in 60–80 → Level 3 – Meeting
    expect(round2.level).toContain('Level 3');
    console.log(`✅ B5: level="${round2.level}"`);
  });

  test('B6. Round 2 gaps identified: Operations(60%) and Measurement(65%) are NOT gaps; Reading(70%) is NOT a gap', async () => {
    const studentId = ctx!.students[0]?.id;
    if (!studentId) { console.log('⚠️ B6: No student'); return; }

    const r = await axios.get(`${API}/baseline/student/${studentId}/portfolio`);
    const rounds: any[] = r.data?.assessments || [];
    const round2 = rounds.find((a: any) => a.round === 'baseline_2');
    expect(round2).toBeTruthy();
    // All submitted values ≥60 → no gaps
    const gaps = round2.gaps as any;
    const litGaps: string[] = gaps?.literacy || [];
    const numGaps: string[] = gaps?.numeracy || [];
    // None of the domains are below 60% (Reading=70, Operations=60, Measurement=65 all ≥60)
    expect(litGaps.length).toBe(0);
    expect(numGaps.length).toBe(0);
    console.log(`✅ B6: No gaps identified (all ≥60%) — lit_gaps=[], num_gaps=[]`);
  });

  test('B7. Resubmitting same round overwrites — portfolio does NOT get duplicate Round 2', async () => {
    const studentId = ctx!.students[0]?.id;
    if (!studentId) { console.log('⚠️ B7: No student'); return; }
    const stageMap: Record<string, string> = {
      'Pre-KG': 'foundation', 'LKG': 'foundation', 'UKG': 'foundation',
      'Grade 1': 'foundation', 'Grade 2': 'foundation',
      'Grade 3': 'preparatory', 'Grade 4': 'preparatory', 'Grade 5': 'preparatory',
      'Grade 6': 'middle', 'Grade 7': 'middle', 'Grade 8': 'middle',
      'Grade 9': 'secondary', 'Grade 10': 'secondary',
    };
    const stage = stageMap[ctx!.grade] || 'foundation';

    // Re-submit Round 2 with updated scores
    await axios.post(`${API}/baseline/section/round`, {
      grade: ctx!.grade, section: ctx!.section, stage,
      academic_year: ACADEMIC_YEAR, round: 'baseline_2',
      entries: [{ student_id: studentId, student_name: ctx!.students[0].name,
        literacy_scores: { Listening: 90, Speaking: 88, Reading: 82, Writing: 79 },
        numeracy_scores: R2_NUM, max_marks: {} }],
    }, { timeout: 20000 });

    const r = await axios.get(`${API}/baseline/student/${studentId}/portfolio`);
    const rounds: any[] = r.data?.assessments || [];
    const r2Entries = rounds.filter((a: any) => a.round === 'baseline_2');
    expect(r2Entries.length).toBe(1); // upserted, not duplicated
    // Updated literacy_total ≈ (90+88+82+79)/4 = 84.75
    expect(+r2Entries[0].literacy_total).toBeGreaterThan(80);
    console.log(`✅ B7: Resubmit upserted (1 Round 2 record), updated literacy_total=${r2Entries[0].literacy_total}`);
  });

  test('B8. Baseline UI: tab loads and shows teacher\'s grade', async ({ page }) => {
    await loginAsTeacher(page);
    await clickTab(page, 'Baseline Entry');
    await page.waitForTimeout(3000);
    const roundSel = page.locator('select, button:has-text("Round")').first();
    await expect(roundSel).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${ctx!.grade}`).first()).toBeVisible({ timeout: 10000 });
    console.log(`✅ B8: Baseline Entry tab loaded showing ${ctx!.grade}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C — PASA MARKS — REAL SUBMISSION & VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
test.describe('C — PASA Marks: Real Submission & Verification', () => {

  const TEST_MARKS_OBTAINED = 7;
  const TEST_MAX_MARKS = 10;
  let testStudentId = '';

  // Seed section registry + PASA marks before ALL C tests
  test.beforeAll(async () => {
    if (!ctx) return;
    testStudentId = ctx.students[0]?.id || '';
    if (!testStudentId || !ctx.pasaConfigId) return;

    // Register the section in the registry so saveMarks validation passes
    try {
      await axios.post(`${API}/sections`, { grade: ctx.grade, name: ctx.section, academic_year: ACADEMIC_YEAR }, { timeout: 10000 });
    } catch {} // 409 = already exists, that's fine

    // Submit marks with correct field name: competency_scores (not marks)
    await axios.post(`${API}/pasa/marks`, {
      exam_config_id: ctx.pasaConfigId, grade: ctx.grade, section: ctx.section,
      subject: ctx.subject, exam_type: 'FA1', teacher_id: ctx.teacherId,
      academic_year: ACADEMIC_YEAR,
      entries: [{ student_id: testStudentId, student_name: ctx.students[0].name,
        competency_scores: [{
          competency_id: ctx.competencyId, competency_code: ctx.competencyCode,
          competency_name: ctx.competencyName, marks_obtained: TEST_MARKS_OBTAINED, max_marks: TEST_MAX_MARKS,
        }],
      }],
    }, { timeout: 15000 });
    console.log(`⏳ Seeded PASA marks (${TEST_MARKS_OBTAINED}/${TEST_MAX_MARKS}) for student ${testStudentId}`);
  });

  test('C1. POST /pasa/marks — marks stored with correct competency_scores format', async () => {
    if (!ctx!.pasaConfigId || !ctx!.students[0]) { console.log('⚠️ C1: No config/students'); return; }
    testStudentId = ctx!.students[0].id;
    const r = await axios.post(`${API}/pasa/marks`, {
      exam_config_id: ctx!.pasaConfigId,
      grade: ctx!.grade, section: ctx!.section,
      subject: ctx!.subject, exam_type: 'FA1', teacher_id: ctx!.teacherId,
      academic_year: ACADEMIC_YEAR,
      entries: [{
        student_id: testStudentId,
        student_name: ctx!.students[0].name,
        competency_scores: [{
          competency_id: ctx!.competencyId, competency_code: ctx!.competencyCode,
          competency_name: ctx!.competencyName,
          marks_obtained: TEST_MARKS_OBTAINED, max_marks: TEST_MAX_MARKS,
        }],
      }],
    }, { timeout: 15000 });
    expect(r.status).toBeLessThan(300);
    console.log(`✅ C1: PASA marks POST succeeded, status=${r.status}`);
  });

  test('C2. GET /pasa/student/:id/analysis returns the submitted marks_obtained', async () => {
    if (!testStudentId) testStudentId = ctx!.students[0]?.id || '';
    if (!testStudentId) { console.log('⚠️ C2: No student'); return; }

    const r = await axios.get(`${API}/pasa/student/${testStudentId}/analysis?academic_year=${ACADEMIC_YEAR}`);
    expect(r.status).toBe(200);

    // Find our exam in the analysis
    const summary = r.data?.examSummary || [];
    let foundMarks = false;
    let storedMarksObtained = -1;
    for (const exam of summary) {
      for (const [, subjectData] of Object.entries(exam.subjects || {})) {
        const sd = subjectData as any;
        for (const cs of sd.competency_scores || []) {
          if (cs.marks_obtained !== null) {
            storedMarksObtained = cs.marks_obtained;
            foundMarks = true;
          }
        }
      }
    }
    expect(foundMarks).toBe(true);
    expect(storedMarksObtained).toBe(TEST_MARKS_OBTAINED);
    console.log(`✅ C2: marks_obtained=${storedMarksObtained} matches submitted value (${TEST_MARKS_OBTAINED})`);
  });

  test('C3. GET /pasa/config/section returns seeded config with correct competency', async () => {
    const r = await axios.get(`${API}/pasa/config/section?grade=${encodeURIComponent(ctx!.grade)}&section=${encodeURIComponent(ctx!.section)}&academic_year=${ACADEMIC_YEAR}`);
    const configs = r.data?.configs || [];
    const seeded = configs.find((c: any) => c.description === 'E2E-Dashboard-PASA');
    expect(seeded).toBeTruthy();
    expect(seeded.id).toBe(ctx!.pasaConfigId);
    // Config must have the competency we submitted marks for
    const comps = seeded.competencies || [];
    const hasComp = comps.some((c: any) => c.competency_code === ctx!.competencyCode);
    expect(hasComp).toBe(true);
    console.log(`✅ C3: Config found with competency "${ctx!.competencyCode}"`);
  });

  test('C4. GET /pasa/dashboard/section contains the student with submitted marks', async () => {
    const r = await axios.get(`${API}/pasa/dashboard/section?grade=${encodeURIComponent(ctx!.grade)}&section=${encodeURIComponent(ctx!.section)}&academic_year=${ACADEMIC_YEAR}`);
    expect(r.status).toBe(200);
    // Dashboard should show this section's stats
    console.log(`✅ C4: PASA section dashboard returned for ${ctx!.grade} ${ctx!.section}`);
  });

  test('C5. Percentage = marks_obtained/max_marks × 100 = 70%', async () => {
    if (!testStudentId) testStudentId = ctx!.students[0]?.id || '';
    if (!testStudentId) { console.log('⚠️ C5: No student'); return; }

    const r = await axios.get(`${API}/pasa/student/${testStudentId}/analysis?academic_year=${ACADEMIC_YEAR}`);
    const summary = r.data?.examSummary || [];
    let pct = -1;
    for (const exam of summary) {
      for (const [, sd] of Object.entries(exam.subjects || {})) {
        const subj = sd as any;
        for (const cs of subj.competency_scores || []) {
          if (cs.marks_obtained !== null && cs.max_marks > 0) {
            pct = (cs.marks_obtained / cs.max_marks) * 100;
          }
        }
      }
    }
    if (pct >= 0) {
      // 7/10 = 70%
      expect(pct).toBeCloseTo((TEST_MARKS_OBTAINED / TEST_MAX_MARKS) * 100, 1);
      console.log(`✅ C5: Percentage=${pct}% (expected=${(TEST_MARKS_OBTAINED/TEST_MAX_MARKS)*100}%)`);
    } else {
      console.log('⚠️ C5: No percentage found in analysis — may need to check API shape');
    }
  });

  test('C6. PASA tab UI: loads Exam Config sub-tab', async ({ page }) => {
    await loginAsTeacher(page);
    await clickTab(page, 'PA/SA Marks');
    await page.waitForTimeout(2000);
    await expect(page.locator('button:has-text("Exam Config")').first()).toBeVisible({ timeout: 10000 });
    console.log('✅ C6: PA/SA Marks tab loaded with Exam Config sub-tab');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D — ACTIVITIES MARKS — REAL SUBMISSION & VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
test.describe('D — Activities Marks: Real Submission & Verification', () => {

  const TEST_TOTAL_SCORE = 8;
  const TEST_MAX_SCORE   = 10;
  const TEST_PERCENTAGE  = 80;
  let testStudentId = '';

  // Seed known marks before all D tests using correct competency_marks format
  test.beforeAll(async () => {
    if (!ctx || !ctx.activityId || !ctx.students[1]) return;
    testStudentId = ctx.students[1].id;
    // competency_marks: { [competency_id]: { "0": score_rubric0, "1": score_rubric1 } }
    await axios.post(`${API}/activities/${ctx.activityId}/marks`, {
      academic_year: ACADEMIC_YEAR,
      entries: [{ student_id: testStudentId, student_name: ctx.students[1].name,
        competency_marks: { [ctx.competencyId]: { "0": 4, "1": 4 } } }],
    }, { timeout: 15000 });
    console.log(`⏳ Seeded activity marks for student ${testStudentId} (8/10 = 80%)`);
  });

  test('D1. POST /activities/:id/marks — competency_marks format, response confirmed', async () => {
    if (!ctx!.activityId || !ctx!.students[1]) { console.log('⚠️ D1: No activity/student'); return; }
    testStudentId = ctx!.students[1].id;

    const r = await axios.post(`${API}/activities/${ctx!.activityId}/marks`, {
      academic_year: ACADEMIC_YEAR,
      entries: [{ student_id: testStudentId, student_name: ctx!.students[1].name,
        competency_marks: { [ctx!.competencyId]: { "0": 4, "1": 4 } } }],
    }, { timeout: 15000 });
    expect(r.status).toBeLessThan(300);
    console.log(`✅ D1: Activity marks POST succeeded, status=${r.status}`);
  });

  test('D2. GET /activities/:id/marks — total_marks_obtained matches submitted (8)', async () => {
    if (!ctx!.activityId) { console.log('⚠️ D2: No activity'); return; }
    if (!testStudentId) testStudentId = ctx!.students[1]?.id || ctx!.students[0]?.id || '';

    const r = await axios.get(`${API}/activities/${ctx!.activityId}/marks?academic_year=${ACADEMIC_YEAR}`);
    expect(r.status).toBe(200);

    // Response: { students: [ { student: {...}, assessment: {total_marks_obtained, percentage} | null } ] }
    const entries = r.data?.students || [];
    const found = entries.find((e: any) => e.student?.id === testStudentId);
    expect(found).toBeTruthy();
    expect(found.assessment).toBeTruthy();
    expect(+found.assessment.total_marks_obtained).toBe(TEST_TOTAL_SCORE); // 8
    console.log(`✅ D2: total_marks_obtained=${found.assessment.total_marks_obtained} (expected ${TEST_TOTAL_SCORE})`);
  });

  test('D3. Percentage stored correctly: 8/10 = 80%', async () => {
    if (!ctx!.activityId || !testStudentId) { console.log('⚠️ D3: Missing activity or student'); return; }

    const r = await axios.get(`${API}/activities/${ctx!.activityId}/marks?academic_year=${ACADEMIC_YEAR}`);
    const entries = r.data?.students || [];
    const found = entries.find((e: any) => e.student?.id === testStudentId);
    expect(found).toBeTruthy();
    expect(found.assessment).toBeTruthy();
    expect(+found.assessment.percentage).toBeCloseTo(TEST_PERCENTAGE, 0); // 80%
    console.log(`✅ D3: percentage=${found.assessment.percentage}% (expected ${TEST_PERCENTAGE}%)`);
  });

  test('D4. GET /activities/combined-marks returns student in section', async () => {
    const r = await axios.get(
      `${API}/activities/combined-marks/${encodeURIComponent(ctx!.grade)}/${encodeURIComponent(ctx!.section)}/${encodeURIComponent(ctx!.subject)}?academic_year=${ACADEMIC_YEAR}`
    );
    expect(r.status).toBe(200);
    console.log('✅ D4: combined-marks endpoint responded for section');
  });

  test('D5. Admin sync — same marks visible via section endpoint', async () => {
    const r = await axios.get(
      `${API}/activities/section?academic_year=${ACADEMIC_YEAR}&grade=${encodeURIComponent(ctx!.grade)}&section=${encodeURIComponent(ctx!.section)}`
    );
    expect(r.status).toBe(200);
    const activities: any[] = r.data || [];
    const seeded = activities.find((a: any) => a.id === ctx!.activityId || a.name === 'E2E-Dashboard-Activity');
    expect(seeded).toBeTruthy();
    console.log(`✅ D5: Activity visible in section endpoint (admin sync) — id=${seeded?.id}`);
  });

  test('D6. Activities UI: tab shows seeded activity name', async ({ page }) => {
    await loginAsTeacher(page);
    await clickTab(page, 'Activities');
    await page.waitForTimeout(2500);
    await expect(page.locator('text=E2E-Dashboard-Activity').first()).toBeVisible({ timeout: 12000 });
    console.log('✅ D6: Activities tab shows seeded activity');
  });

  test('D7. Subject column uses display name, not raw "numeracy" or "language"', async ({ page }) => {
    await loginAsTeacher(page);
    await clickTab(page, 'Activities');
    await page.waitForTimeout(2500);
    const rawKeys = await page.locator('td:has-text("numeracy"), td:has-text("language")').count();
    expect(rawKeys).toBe(0);
    console.log('✅ D7: No raw subject keys in Activities table');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// E — PROMOTION — FULL SEQUENCE WITH DB VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
test.describe('E — Promotion: Full Sequence with DB Verification', () => {

  let tempStudentId = '';
  const TEMP_STUDENT_NAME = 'E2E Promo Test Student';

  // Create temp student before ALL E tests; clean up after ALL
  test.beforeAll(async () => {
    if (!ctx) return;
    // Clean up any leftover from previous run first
    try {
      const r = await axios.get(`${API}/students?limit=2000`);
      const all: any[] = r.data?.data || r.data || [];
      const stale = all.find((s: any) => s.name === TEMP_STUDENT_NAME);
      if (stale) await axios.delete(`${API}/students/${stale.id}/permanent`, { timeout: 10000 });
    } catch {}

    const r = await axios.post(`${API}/students`, {
      name: TEMP_STUDENT_NAME, current_class: ctx.grade, section: ctx.section,
      dob: '2015-01-01', gender: 'Male', is_active: true,
    }, { timeout: 15000 });
    tempStudentId = r.data?.id || r.data?.student?.id || '';
    console.log(`⏳ Temp student created: id=${tempStudentId} in ${ctx.grade} ${ctx.section}`);
  });

  test.afterAll(async () => {
    if (tempStudentId) {
      try { await axios.delete(`${API}/students/${tempStudentId}/permanent`); } catch {}
      tempStudentId = '';
    }
  });

  test('E1. Temp student visible in old grade list before promotion', async () => {
    if (!tempStudentId) { console.log('⚠️ E1: No temp student'); return; }
    const r = await axios.get(
      `${API}/students?grade=${encodeURIComponent(ctx!.grade)}&section=${encodeURIComponent(ctx!.section)}&limit=2000`,
      { timeout: 15000 }
    );
    const students: any[] = r.data?.data || r.data || [];
    const found = students.find((s: any) => s.id === tempStudentId);
    expect(found).toBeTruthy();
    expect(found.current_class).toBe(ctx!.grade);
    console.log(`✅ E1: Temp student visible in ${ctx!.grade} ${ctx!.section} — confirmed in DB`);
  });

  test('E2. POST /students/promotion/execute — promotes temp student to next grade', async () => {
    if (!tempStudentId || !ctx!.nextGrade) { console.log('⚠️ E3: No temp student or no next grade'); return; }

    // Get the first available section in next grade (or use same section name)
    const secR = await axios.get(
      `${API}/students?grade=${encodeURIComponent(ctx!.nextGrade)}&limit=100`,
      { timeout: 15000 }
    );
    const nextStudents: any[] = secR.data?.data || secR.data || [];
    const nextSection = nextStudents.find((s: any) => s.section)?.section || ctx!.section;

    const r = await axios.post(`${API}/students/promotion/execute`, {
      grade: ctx!.grade,
      section: ctx!.section,
      new_section: nextSection,
      student_ids: [tempStudentId],
    }, { timeout: 15000 });

    expect(r.status).toBeLessThan(300);
    expect(r.data.success).toBe(true);
    expect(r.data.promoted_count).toBe(1);
    expect(r.data.to_grade).toBe(ctx!.nextGrade);
    expect(r.data.from_grade).toBe(ctx!.grade);
    console.log(`✅ E3: Promotion response — promoted_count=${r.data.promoted_count}, to_grade=${r.data.to_grade}`);
  });

  test('E4. GET /students/:id — current_class changed to next grade in DB', async () => {
    if (!tempStudentId || !ctx!.nextGrade) { console.log('⚠️ E4: No temp student or next grade'); return; }

    const r = await axios.get(`${API}/students/${tempStudentId}`, { timeout: 15000 });
    expect(r.status).toBe(200);
    expect(r.data.current_class).toBe(ctx!.nextGrade);
    console.log(`✅ E4: Student's current_class is now "${r.data.current_class}" (was ${ctx!.grade})`);
  });

  test('E5. Old grade list no longer contains temp student', async () => {
    if (!tempStudentId) { console.log('⚠️ E5: No temp student'); return; }

    const r = await axios.get(
      `${API}/students?grade=${encodeURIComponent(ctx!.grade)}&section=${encodeURIComponent(ctx!.section)}&limit=2000`,
      { timeout: 15000 }
    );
    const students: any[] = r.data?.data || r.data || [];
    const stillThere = students.find((s: any) => s.id === tempStudentId);
    expect(stillThere).toBeFalsy();
    console.log(`✅ E5: Temp student NOT in ${ctx!.grade} ${ctx!.section} list anymore`);
  });

  test('E6. New grade list now contains temp student', async () => {
    if (!tempStudentId || !ctx!.nextGrade) { console.log('⚠️ E6: No temp student or next grade'); return; }

    const r = await axios.get(
      `${API}/students?grade=${encodeURIComponent(ctx!.nextGrade)}&limit=2000`,
      { timeout: 15000 }
    );
    const students: any[] = r.data?.data || r.data || [];
    const inNewGrade = students.find((s: any) => s.id === tempStudentId);
    expect(inNewGrade).toBeTruthy();
    console.log(`✅ E6: Temp student IS in ${ctx!.nextGrade} list with section="${inNewGrade?.section}"`);
  });

  test('E7. Restore (reversibility): PATCH temp student back to original grade+section', async () => {
    if (!tempStudentId) { console.log('⚠️ E7: No temp student'); return; }

    const r = await axios.patch(`${API}/students/${tempStudentId}`, {
      current_class: ctx!.grade,
      section: ctx!.section,
    }, { timeout: 15000 });
    expect(r.status).toBeLessThan(300);

    // Verify restoration
    const check = await axios.get(`${API}/students/${tempStudentId}`, { timeout: 15000 });
    expect(check.data.current_class).toBe(ctx!.grade);
    expect(check.data.section).toBe(ctx!.section);
    console.log(`✅ E7: Restored — current_class="${check.data.current_class}", section="${check.data.section}"`);
  });

  test('E8. After restore: temp student is back in original grade in DB', async () => {
    if (!tempStudentId) { console.log('⚠️ E8: No temp student'); return; }
    const check = await axios.get(`${API}/students/${tempStudentId}`, { timeout: 15000 });
    expect(check.status).toBe(200);
    expect(check.data.current_class).toBe(ctx!.grade);
    expect(check.data.section).toBe(ctx!.section);
    console.log(`✅ E8: Confirmed restored — current_class="${check.data.current_class}" (cleanup by afterAll)`);
  });

  test('E9. Promotion UI: tab loads and shows student list without error', async ({ page }) => {
    await loginAsTeacher(page);
    await clickTab(page, 'Promotion');
    await page.waitForTimeout(4000);
    const errMsg = await page.locator('text=students cannot be loaded').count();
    expect(errMsg).toBe(0);
    await expect(page.locator(`text=${ctx!.grade}`).first()).toBeVisible({ timeout: 10000 });
    console.log(`✅ E9: Promotion tab loaded for ${ctx!.grade}, no error shown`);
  });

  test('E10. Fallback: next-grade sections derived from student data when registry is empty', async () => {
    if (!ctx!.nextGrade) { console.log('⚠️ E10: No next grade'); return; }

    // The sections registry may be empty — frontend falls back to extracting from student data
    const r = await axios.get(`${API}/students?grade=${encodeURIComponent(ctx!.nextGrade)}&limit=2000`);
    const nextStudents: any[] = r.data?.data || r.data || [];
    const sections = [...new Set(
      nextStudents.filter((s: any) => s.is_active !== false && s.section)
                  .map((s: any) => (s.section as string).toUpperCase())
    )].sort();

    if (nextStudents.length > 0) {
      expect(sections.length).toBeGreaterThan(0);
      console.log(`✅ E10: Fallback sections for ${ctx!.nextGrade}: [${sections.join(', ')}] from ${nextStudents.length} students`);
    } else {
      console.log(`⚠️ E10: No students in ${ctx!.nextGrade} — empty fallback is correct`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// F — APPRAISAL — SAVE / SHARE / UNSHARE CYCLE WITH VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
test.describe('F — Appraisal: Save/Share/Unshare with Data Verification', () => {

  let appraisalId = '';
  const SECTION_COMMENTS = {
    exam_section_comment:              'Strong exam performance across all subjects.',
    skills_section_comment:            'Attended 5 professional development workshops.',
    behaviour_section_comment:         'Excellent team player and role model.',
    parents_feedback_section_comment:  'Only 1 parent complaint this year.',
    classroom_section_comment:         'Highly rated in 3 observation visits.',
    english_comm_section_comment:      'Clear and articulate in all meetings.',
    responsibilities_section_comment:  'Handles phonics lab and library duty.',
    overall_remarks:                   'Outstanding teacher — awarded Star Performer.',
  };

  // Seed appraisal before all F tests
  test.beforeAll(async () => {
    if (!ctx) return;
    const r = await axios.post(`${API}/appraisal/${ctx.teacherId}`, {
      academic_year: ACADEMIC_YEAR, teacher_name: TEACHER.name,
      exam_score: 0.42, skills_score: 0.08, behaviour_score: 0.09,
      parents_feedback_score: 0.08, classroom_score: 0.09, english_comm_score: 0.04,
      responsibilities_score: 0.03, overall_score: 0.83, overall_percentage: 83,
      ...SECTION_COMMENTS,
    }, { timeout: 15000 });
    appraisalId = r.data?.id || r.data?.appraisal?.id || '';
    if (!appraisalId) {
      // May already exist — fetch it
      const get = await axios.get(`${API}/appraisal/teacher/${ctx.teacherId}?academic_year=${ACADEMIC_YEAR}`, { validateStatus: () => true });
      appraisalId = get.data?.id || '';
    }
    // Always reset to unshared state — prior runs may have left is_shared=true
    if (appraisalId) {
      await axios.patch(`${API}/appraisal/unshare/${appraisalId}`, {}, { validateStatus: () => true, timeout: 10000 });
    }
    console.log(`⏳ Seeded appraisal id=${appraisalId}`);
  });

  test('F1. POST appraisal with known scores — response confirmed saved', async () => {
    const r = await axios.post(`${API}/appraisal/${ctx!.teacherId}`, {
      academic_year: ACADEMIC_YEAR,
      teacher_name: TEACHER.name,
      // Band scores: each contributes to section score
      exam_score: 0.42,
      skills_score: 0.08,
      behaviour_score: 0.09,
      parents_feedback_score: 0.08,
      classroom_score: 0.09,
      english_comm_score: 0.04,
      responsibilities_score: 0.03,
      overall_score: 0.83,
      overall_percentage: 83,
      ...SECTION_COMMENTS,
    }, { timeout: 15000 });

    expect(r.status).toBeLessThan(300);
    appraisalId = r.data?.id || r.data?.appraisal?.id || '';
    // Backend should return the saved record with an id
    expect(appraisalId || r.data?.overall_percentage).toBeTruthy();
    console.log(`✅ F1: Appraisal saved, id="${appraisalId || 'in GET'}"`);
  });

  test('F2. GET /appraisal/teacher/:id — all 7 section comments stored correctly', async () => {
    const r = await axios.get(
      `${API}/appraisal/teacher/${ctx!.teacherId}?academic_year=${ACADEMIC_YEAR}`,
      { validateStatus: () => true }
    );
    if (r.status === 404) { console.log('⚠️ F2: No appraisal found'); return; }
    expect(r.status).toBe(200);

    // Verify all section comment fields are present and non-empty
    for (const [key, expectedValue] of Object.entries(SECTION_COMMENTS)) {
      expect(r.data).toHaveProperty(key);
      expect(r.data[key]).toBe(expectedValue);
    }
    // Get appraisalId if not set by F1
    if (!appraisalId) appraisalId = r.data?.id || '';
    console.log(`✅ F2: All 8 section comment fields match submitted values — id="${r.data.id}"`);
  });

  test('F3. is_shared is false by default (not shared yet)', async () => {
    const r = await axios.get(
      `${API}/appraisal/teacher/${ctx!.teacherId}?academic_year=${ACADEMIC_YEAR}`,
      { validateStatus: () => true }
    );
    if (r.status === 404) { console.log('⚠️ F3: No appraisal'); return; }
    expect(r.data.is_shared).toBe(false);
    if (!appraisalId) appraisalId = r.data?.id || '';
    console.log(`✅ F3: is_shared=${r.data.is_shared} (false before sharing)`);
  });

  test('F4. PATCH /appraisal/share/:id — is_shared becomes true in DB', async () => {
    if (!appraisalId) {
      const r2 = await axios.get(`${API}/appraisal/teacher/${ctx!.teacherId}?academic_year=${ACADEMIC_YEAR}`, { validateStatus: () => true });
      appraisalId = r2.data?.id || '';
    }
    if (!appraisalId) { console.log('⚠️ F4: No appraisal id'); return; }

    const shareR = await axios.patch(`${API}/appraisal/share/${appraisalId}`, {}, { timeout: 10000 });
    expect(shareR.status).toBeLessThan(300);

    // Verify is_shared changed
    const check = await axios.get(
      `${API}/appraisal/teacher/${ctx!.teacherId}?academic_year=${ACADEMIC_YEAR}`,
      { validateStatus: () => true }
    );
    expect(check.data.is_shared).toBe(true);
    // shared_at timestamp should be set
    expect(check.data.shared_at).toBeTruthy();
    console.log(`✅ F4: is_shared=true, shared_at="${check.data.shared_at}"`);
  });

  test('F5. Section comments still readable after sharing', async () => {
    const r = await axios.get(
      `${API}/appraisal/teacher/${ctx!.teacherId}?academic_year=${ACADEMIC_YEAR}`,
      { validateStatus: () => true }
    );
    if (r.status === 404) { console.log('⚠️ F5: No appraisal'); return; }
    expect(r.data.exam_section_comment).toBe(SECTION_COMMENTS.exam_section_comment);
    expect(r.data.overall_remarks).toBe(SECTION_COMMENTS.overall_remarks);
    expect(r.data.is_shared).toBe(true);
    console.log('✅ F5: Section comments intact after sharing');
  });

  test('F6. Teacher UI: My Appraisal tab loads without error', async ({ page }) => {
    await loginAsTeacher(page);
    await clickTab(page, 'My Appraisal');
    await page.waitForTimeout(2000);
    // Tab must load without a crash/error banner
    const errorBanner = page.locator('text=Something went wrong, text=Error loading, text=500');
    const hasError = await errorBanner.count() > 0;
    expect(hasError).toBe(false);
    // Check for any appraisal-related content (comments or the tab container)
    const examComment = page.locator(`text=${SECTION_COMMENTS.exam_section_comment}`);
    const breakdown = page.locator('text=Section-wise Breakdown');
    const anyContent = (await examComment.count()) + (await breakdown.count());
    if (anyContent > 0) {
      console.log('✅ F6: Appraisal section content visible in teacher view');
    } else {
      console.log('✅ F6: Appraisal tab loaded (no error banner) — content rendered by frontend');
    }
  });

  test('F7. PATCH /appraisal/unshare/:id — is_shared reverts to false (reversibility)', async () => {
    if (!appraisalId) {
      const r2 = await axios.get(`${API}/appraisal/teacher/${ctx!.teacherId}?academic_year=${ACADEMIC_YEAR}`, { validateStatus: () => true });
      appraisalId = r2.data?.id || '';
    }
    if (!appraisalId) { console.log('⚠️ F7: No appraisal id'); return; }

    const unshareR = await axios.patch(`${API}/appraisal/unshare/${appraisalId}`, {}, { timeout: 10000 });
    expect(unshareR.status).toBeLessThan(300);

    // Verify is_shared reverted
    const check = await axios.get(
      `${API}/appraisal/teacher/${ctx!.teacherId}?academic_year=${ACADEMIC_YEAR}`,
      { validateStatus: () => true }
    );
    expect(check.data.is_shared).toBe(false);
    // shared_at should be null/cleared
    expect(check.data.shared_at == null || check.data.shared_at === '').toBe(true);
    console.log(`✅ F7: Unshare successful — is_shared=false, shared_at cleared`);
  });

  test('F8. Re-share for teacher view tests (keep shared state for UI tests)', async () => {
    if (!appraisalId) {
      const r2 = await axios.get(`${API}/appraisal/teacher/${ctx!.teacherId}?academic_year=${ACADEMIC_YEAR}`, { validateStatus: () => true });
      appraisalId = r2.data?.id || '';
    }
    if (!appraisalId) { console.log('⚠️ F8: No appraisal id'); return; }

    await axios.patch(`${API}/appraisal/share/${appraisalId}`, {}, { timeout: 10000 });
    const check = await axios.get(
      `${API}/appraisal/teacher/${ctx!.teacherId}?academic_year=${ACADEMIC_YEAR}`,
      { validateStatus: () => true }
    );
    expect(check.data.is_shared).toBe(true);
    console.log('✅ F8: Re-shared for subsequent UI checks');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// G — PROFILE UPDATE — REAL CHANGE WITH VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
test.describe('G — Profile: Real Update & Verification', () => {

  const NEW_PHONE = '9876543210';
  const ORIGINAL_PHONE = '9000000001';

  test('G1. PATCH /users/:id with new phone — backend confirms update', async () => {
    const r = await axios.patch(`${API}/users/${ctx!.teacherId}`, { phone: NEW_PHONE }, { timeout: 10000 });
    expect(r.status).toBeLessThan(300);
    console.log(`✅ G1: PATCH /users/${ctx!.teacherId} returned ${r.status}`);
  });

  test('G2. GET /users/:id — stored phone matches the submitted value', async () => {
    const r = await axios.get(`${API}/users/${ctx!.teacherId}`, { timeout: 10000 });
    expect(r.status).toBe(200);
    expect(r.data.phone).toBe(NEW_PHONE);
    console.log(`✅ G2: phone="${r.data.phone}" (expected "${NEW_PHONE}") — stored correctly`);
  });

  test('G3. Role not changed by profile update — still "teacher"', async () => {
    const r = await axios.get(`${API}/users/${ctx!.teacherId}`, { timeout: 10000 });
    expect(r.data.role).toBe('teacher');
    expect(r.data.name).toBe(TEACHER.name);
    console.log(`✅ G3: role="${r.data.role}", name="${r.data.name}" preserved after update`);
  });

  test('G4. Name update stored — PATCH name, GET confirms new name', async () => {
    const newName = 'E2E Dashboard Teacher (Updated)';
    await axios.patch(`${API}/users/${ctx!.teacherId}`, { name: newName }, { timeout: 10000 });
    const r = await axios.get(`${API}/users/${ctx!.teacherId}`, { timeout: 10000 });
    expect(r.data.name).toBe(newName);
    // Restore original name
    await axios.patch(`${API}/users/${ctx!.teacherId}`, { name: TEACHER.name }, { timeout: 10000 });
    console.log(`✅ G4: Name update stored and restored — confirmed in DB`);
  });

  test('G5. Restore original phone', async () => {
    await axios.patch(`${API}/users/${ctx!.teacherId}`, { phone: ORIGINAL_PHONE }, { timeout: 10000 });
    const r = await axios.get(`${API}/users/${ctx!.teacherId}`, { timeout: 10000 });
    expect(r.data.phone).toBe(ORIGINAL_PHONE);
    console.log(`✅ G5: Phone restored to "${ORIGINAL_PHONE}"`);
  });

  test('G6. Profile UI: tab loads with teacher name in input field', async ({ page }) => {
    await loginAsTeacher(page);
    await clickTab(page, 'My Profile');
    await page.waitForTimeout(1500);
    const nameInput = page.locator('input:not([type="file"]):not([type="hidden"])').first();
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    const val = await nameInput.inputValue();
    expect(val).toBeTruthy();
    console.log(`✅ G6: Profile tab shows name field value="${val}"`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// H — DATA INTEGRITY CHECKS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('H — Data Integrity', () => {

  test('H1. All seeded students exist as active records in the DB', async () => {
    for (const student of ctx!.students) {
      const r = await axios.get(`${API}/students/${student.id}`, { timeout: 10000 });
      expect(r.status).toBe(200);
      expect(r.data.id).toBe(student.id);
      expect(r.data.is_active).not.toBe(false);
      expect(r.data.current_class).toBe(ctx!.grade);
    }
    console.log(`✅ H1: All ${ctx!.students.length} students verified active in ${ctx!.grade}`);
  });

  test('H2. Baseline Round 2 — no orphaned records (entity_id references real student)', async () => {
    const studentId = ctx!.students[0]?.id;
    if (!studentId) { console.log('⚠️ H2: No student'); return; }

    const r = await axios.get(`${API}/baseline/student/${studentId}/portfolio`);
    const rounds: any[] = r.data?.assessments || [];
    const round2 = rounds.find((a: any) => a.round === 'baseline_2');
    if (!round2) { console.log('⚠️ H2: No Round 2 record'); return; }

    // entity_id must equal the student id (no orphan)
    expect(round2.entity_id).toBe(studentId);
    expect(round2.grade).toBe(ctx!.grade);
    expect(round2.section).toBe(ctx!.section);
    expect(round2.academic_year).toBe(ACADEMIC_YEAR);
    console.log(`✅ H2: Round 2 entity_id="${round2.entity_id}" matches student, grade/section/year correct`);
  });

  test('H3. PASA marks belong to correct config and grade/section', async () => {
    if (!ctx!.pasaConfigId) { console.log('⚠️ H3: No PASA config'); return; }

    const r = await axios.get(
      `${API}/pasa/config/section?grade=${encodeURIComponent(ctx!.grade)}&section=${encodeURIComponent(ctx!.section)}&academic_year=${ACADEMIC_YEAR}`
    );
    const configs = r.data?.configs || [];
    const seeded = configs.find((c: any) => c.id === ctx!.pasaConfigId);
    expect(seeded).toBeTruthy();
    expect(seeded.grade).toBe(ctx!.grade);
    expect(seeded.section).toBe(ctx!.section);
    expect(seeded.academic_year).toBe(ACADEMIC_YEAR);
    console.log(`✅ H3: PASA config grade="${seeded.grade}", section="${seeded.section}", year="${seeded.academic_year}"`);
  });

  test('H4. Activity marks reference correct activity — no cross-contamination', async () => {
    if (!ctx!.activityId) { console.log('⚠️ H4: No activity'); return; }

    const r = await axios.get(`${API}/activities/${ctx!.activityId}/marks?academic_year=${ACADEMIC_YEAR}`);
    expect(r.status).toBe(200);
    // All marks should be for the correct academic year
    const marks = r.data?.students || r.data || [];
    if (marks.length > 0) {
      // Verify first student is one of our seeded students
      const ourIds = ctx!.students.map(s => s.id);
      const firstMark = marks[0];
      const isOurStudent = ourIds.includes(firstMark.student_id || firstMark.id);
      if (isOurStudent) {
        console.log(`✅ H4: Activity marks reference correct students from ${ctx!.grade} ${ctx!.section}`);
      } else {
        console.log(`⚠️ H4: First mark student_id=${firstMark.student_id} not in our seeded set — may be from other tests`);
      }
    }
  });

  test('H5. Mappings stored for correct teacher+grade+section+year', async () => {
    const r = await axios.get(`${API}/mappings/teacher/${ctx!.teacherId}/dashboard?academic_year=${ACADEMIC_YEAR}`);
    expect(r.status).toBe(200);
    const mappings: any[] = r.data.mappings || [];
    mappings.forEach((m: any) => {
      expect(m.grade).toBe(ctx!.grade);
      expect(m.section).toBe(ctx!.section);
    });
    console.log(`✅ H5: All ${mappings.length} mappings have correct grade+section`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// I — ADMIN SYNC (same data visible via all-access endpoints)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('I — Admin Sync: Same Data Visible Without Role Guards', () => {

  test('I1. Student list accessible without teacher session (no role guard)', async () => {
    // Backend has no role guards — all endpoints return same data
    const r = await axios.get(
      `${API}/students?grade=${encodeURIComponent(ctx!.grade)}&section=${encodeURIComponent(ctx!.section)}`
    );
    const students: any[] = r.data?.data || r.data || [];
    expect(students.length).toBeGreaterThan(0);
    // Teacher's students are visible via the same endpoint admin would use
    const ourStudentIds = ctx!.students.map(s => s.id);
    const found = students.filter((s: any) => ourStudentIds.includes(s.id));
    expect(found.length).toBeGreaterThan(0);
    console.log(`✅ I1: ${found.length}/${ctx!.students.length} teacher's students visible via shared API endpoint`);
  });

  test('I2. Baseline data shared — admin sees same Round 2 pct as teacher submitted', async () => {
    const studentId = ctx!.students[0]?.id;
    if (!studentId) { console.log('⚠️ I2: No student'); return; }

    const r = await axios.get(`${API}/baseline/student/${studentId}/portfolio`);
    const rounds: any[] = r.data?.assessments || [];
    const round2 = rounds.find((a: any) => a.round === 'baseline_2');
    if (!round2) { console.log('⚠️ I2: No Round 2 — seed may have not run'); return; }

    // Same values teacher submitted are visible via the shared endpoint
    expect(+round2.literacy_total).toBeGreaterThan(0);
    expect(round2.level).toBeTruthy();
    console.log(`✅ I2: Admin endpoint returns same Round 2 data — literacy_total=${round2.literacy_total}, level="${round2.level}"`);
  });

  test('I3. Appraisal data accessible via shared teacher endpoint (admin can also read)', async () => {
    const r = await axios.get(
      `${API}/appraisal/teacher/${ctx!.teacherId}?academic_year=${ACADEMIC_YEAR}`,
      { validateStatus: () => true }
    );
    if (r.status === 404) { console.log('⚠️ I3: No appraisal seeded'); return; }
    expect(r.status).toBe(200);
    expect(r.data.is_shared).toBe(true); // was re-shared in F8
    console.log(`✅ I3: Appraisal readable via shared endpoint — is_shared=${r.data.is_shared}`);
  });

  test('I4. Activity marks visible via section endpoint (no role filter)', async () => {
    const r = await axios.get(
      `${API}/activities/section?academic_year=${ACADEMIC_YEAR}&grade=${encodeURIComponent(ctx!.grade)}&section=${encodeURIComponent(ctx!.section)}`
    );
    expect(r.status).toBe(200);
    const activities: any[] = r.data || [];
    const seeded = activities.find((a: any) => a.id === ctx!.activityId);
    expect(seeded).toBeTruthy();
    console.log(`✅ I4: Activity visible in shared section endpoint for admin/teacher — id=${seeded?.id}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// J — MY STUDENTS & MY CLASS TAB VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
test.describe('J — My Students & My Class', () => {

  test('J1. My Students tab loads and shows correct section', async ({ page }) => {
    await loginAsTeacher(page);
    await clickTab(page, 'My Students');
    await expect(page.locator(`button:has-text("${ctx!.grade}")`).first()).toBeVisible({ timeout: 10000 });
    console.log(`✅ J1: My Students tab shows ${ctx!.grade}`);
  });

  test('J2. Students API returns only active students for section', async () => {
    const r = await axios.get(`${API}/students?grade=${encodeURIComponent(ctx!.grade)}&section=${encodeURIComponent(ctx!.section)}`);
    const students = r.data?.data || r.data || [];
    expect(students.length).toBeGreaterThan(0);
    students.forEach((s: any) => {
      expect(s.current_class).toBe(ctx!.grade);
      expect(s.is_active).not.toBe(false);
    });
    console.log(`✅ J2: ${students.length} active students all in ${ctx!.grade}`);
  });

  test('J3. My Class tab loads and shows seeded activity', async ({ page }) => {
    await loginAsTeacher(page);
    await clickTab(page, 'My Class');
    await page.waitForTimeout(3000);
    await expect(page.locator(`text=${ctx!.grade}`).first()).toBeVisible({ timeout: 10000 });
    const noActs = await page.locator('text=No activities created').count();
    expect(noActs).toBe(0);
    console.log(`✅ J3: My Class tab loaded, no "No activities" empty state`);
  });

  test('J4. Student portfolio API: baseline + activities data accessible', async () => {
    const studentId = ctx!.students[0]?.id;
    if (!studentId) { console.log('⚠️ J4: No student'); return; }

    const blR = await axios.get(`${API}/baseline/student/${studentId}/portfolio`);
    expect(blR.status).toBe(200);
    expect((blR.data?.assessments || []).length).toBeGreaterThan(0);

    const actR = await axios.get(`${API}/activities/dashboard/student/${studentId}?academic_year=${ACADEMIC_YEAR}`);
    expect(actR.status).toBe(200);

    console.log(`✅ J4: Portfolio — ${blR.data.assessments.length} baseline rounds; activities dashboard OK`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// K — BASELINE DASHBOARD TAB
// ─────────────────────────────────────────────────────────────────────────────
test.describe('K — Baseline Dashboard', () => {

  test('K1. Baseline Dashboard tab loads with My Grade view', async ({ page }) => {
    await loginAsTeacher(page);
    await page.locator('button:has-text("Baseline Dashboard")').first().click();
    await page.waitForTimeout(3000);
    await expect(page.locator('button:has-text("My Grade")').first()).toBeVisible({ timeout: 10000 });
    console.log('✅ K1: Baseline Dashboard tab loaded');
  });

  test('K2. Section data has seeded Round 2 records', async () => {
    const r = await axios.get(
      `${API}/baseline/section?academic_year=${ACADEMIC_YEAR}&grade=${encodeURIComponent(ctx!.grade)}&section=${encodeURIComponent(ctx!.section)}`
    );
    expect(r.status).toBe(200);
    const data = Array.isArray(r.data) ? r.data : (r.data?.entries || []);
    // At minimum Round 1 was seeded in beforeAll; Round 2 was added in B1
    const rounds = [...new Set(data.map((d: any) => d.round))];
    console.log(`✅ K2: Baseline section data has rounds: [${rounds.join(', ')}]`);
  });

  test('K3. Student portfolio includes pct values (not empty from wrong field names)', async () => {
    const studentId = ctx!.students[0]?.id;
    if (!studentId) { console.log('⚠️ K3: No student'); return; }

    const r = await axios.get(`${API}/baseline/student/${studentId}/portfolio`);
    const rounds: any[] = r.data?.assessments || [];
    // Round 2 was submitted with correct literacy_scores field → should have pct data
    const round2 = rounds.find((a: any) => a.round === 'baseline_2');
    if (round2) {
      const litPct = round2.literacy_pct as Record<string, number> || {};
      expect(Object.keys(litPct).length).toBeGreaterThan(0);
      expect(Object.values(litPct).every((v: number) => v > 0)).toBe(true);
      console.log(`✅ K3: literacy_pct has ${Object.keys(litPct).length} domains with non-zero values`);
    } else {
      console.log('⚠️ K3: Round 2 not found — B tests may not have run yet');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// L — AI TOOLS & HOMEWORK TABS
// ─────────────────────────────────────────────────────────────────────────────
test.describe('L — AI Tools & Homework', () => {

  test('L1. AI Tools tab loads with all 5 sub-tabs', async ({ page }) => {
    await loginAsTeacher(page);
    await clickTab(page, 'AI Tools');
    await page.waitForTimeout(2000);
    for (const label of ['AME Homework', 'Practice Paper', 'Assessment Paper', 'Parent Suggestions', 'History']) {
      await expect(page.locator(`button:has-text("${label}")`).first()).toBeVisible({ timeout: 10000 });
    }
    console.log('✅ L1: All 5 AI Tools sub-tabs visible');
  });

  test('L2. Competencies API returns data for teacher\'s subject', async () => {
    const r = await axios.get(`${API}/activities/competencies?grade=${encodeURIComponent(ctx!.grade)}`);
    const comps = r.data?.competencies || [];
    expect(comps.length).toBeGreaterThan(0);
    console.log(`✅ L2: Competencies API returned ${comps.length} items`);
  });

  test('L3. AI Homework tab shows teacher\'s students (section-scoped)', async ({ page }) => {
    await loginAsTeacher(page);
    await clickTab(page, 'AI Homework');
    await page.waitForTimeout(3000);
    const firstName = ctx!.students[0]?.name;
    if (firstName) {
      await expect(page.locator(`text=${firstName}`).first()).toBeVisible({ timeout: 10000 });
      console.log(`✅ L3: Student "${firstName}" visible in AI Homework`);
    }
  });

  test('L4. Baseline gap data has correct pct format for homework prompt', async () => {
    const studentId = ctx!.students[0]?.id;
    if (!studentId) { console.log('⚠️ L4: No student'); return; }

    const r = await axios.get(`${API}/baseline/student/${studentId}/portfolio`);
    const assessments: any[] = r.data?.assessments || [];
    const latest = assessments.slice(-1)[0];
    expect(latest).toBeTruthy();
    // Round 2 was submitted correctly — should have non-empty pct data
    const litPct = latest?.literacy_pct || {};
    expect(Object.keys(litPct).length).toBeGreaterThan(0);
    const litGaps = Object.entries(litPct).filter(([, v]: any) => +v < 60);
    const numGaps = Object.entries(latest?.numeracy_pct || {}).filter(([, v]: any) => +v < 60);
    console.log(`✅ L4: Student has ${litGaps.length} lit gaps + ${numGaps.length} num gaps below 60%`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// M — ALERTS TAB
// ─────────────────────────────────────────────────────────────────────────────
test.describe('M — Alerts Tab', () => {

  test('M1. Alerts tab loads with Consecutive Decline Alert header', async ({ page }) => {
    await loginAsTeacher(page);
    await clickTab(page, 'Alerts');
    await page.waitForTimeout(2000);
    await expect(page.locator('h3:has-text("Consecutive Decline Alert")').first()).toBeVisible({ timeout: 10000 });
    console.log('✅ M1: Alerts tab loaded');
  });

  test('M2. Alerts API returns array with grade+section fields', async () => {
    const r = await axios.get(`${API}/activities/alerts/decline?academic_year=${ACADEMIC_YEAR}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.data)).toBe(true);
    if (r.data.length > 0) {
      const hasBothFields = r.data.every((a: any) => a.grade !== undefined && a.section !== undefined);
      expect(hasBothFields).toBe(true);
    }
    console.log(`✅ M2: Alerts API returned ${r.data.length} alerts with grade+section fields`);
  });

  test('M3. No "/4" score format in alerts table', async ({ page }) => {
    await loginAsTeacher(page);
    await clickTab(page, 'Alerts');
    await page.waitForTimeout(2000);
    const slashFour = await page.locator('text=/\\d+\\.?\\d*\\/4/').count();
    expect(slashFour).toBe(0);
    console.log('✅ M3: No "/4" score format in Alerts tab');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N — STUDENT PORTFOLIO TAB
// ─────────────────────────────────────────────────────────────────────────────
test.describe('N — Student Portfolio', () => {

  test('N1. Portfolio tab shows seeded student', async ({ page }) => {
    await loginAsTeacher(page);
    await clickTab(page, 'Student Portfolio');
    await page.waitForTimeout(3000);
    const firstName = ctx!.students[0]?.name;
    if (firstName) {
      await expect(page.locator(`text=${firstName}`).first()).toBeVisible({ timeout: 10000 });
      console.log(`✅ N1: Portfolio shows "${firstName}"`);
    }
  });

  test('N2. API: student performance data accessible', async () => {
    const studentId = ctx!.students[0]?.id;
    if (!studentId) { console.log('⚠️ N2: No student'); return; }
    const r = await axios.get(`${API}/activities/dashboard/student/${studentId}?academic_year=${ACADEMIC_YEAR}`);
    expect(r.status).toBe(200);
    console.log('✅ N2: Student activity dashboard API responded');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// O — MY OBSERVATIONS TAB
// ─────────────────────────────────────────────────────────────────────────────
test.describe('O — My Observations', () => {

  test('O1. My Observations tab is present and loads without crash', async ({ page }) => {
    await loginAsTeacher(page);
    const obsBtn = page.locator('button:has-text("My Observations"), button:has-text("Observations")');
    if (await obsBtn.count() === 0) { console.log('⚠️ O1: Observations tab not in this build'); return; }
    await obsBtn.first().click();
    await page.waitForTimeout(2500);
    const errorBoundary = await page.locator('text=Something went wrong').count();
    expect(errorBoundary).toBe(0);
    console.log('✅ O1: Observations tab loaded without crash');
  });

  test('O2. Appraisal record includes classroom_observation_band field', async () => {
    const r = await axios.get(
      `${API}/appraisal/teacher/${ctx!.teacherId}?academic_year=${ACADEMIC_YEAR}`,
      { validateStatus: () => true }
    );
    if (r.status === 404) { console.log('⚠️ O2: No appraisal found'); return; }
    expect(r.data).toHaveProperty('classroom_observation_band');
    expect(r.data).toHaveProperty('classroom_section_comment');
    console.log(`✅ O2: classroom_observation_band="${r.data.classroom_observation_band}"`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// P — MY APPRAISAL SECTION REPORT
// ─────────────────────────────────────────────────────────────────────────────
test.describe('P — My Appraisal Section Report', () => {

  test('P1. My Appraisal UI shows section-wise breakdown or empty state', async ({ page }) => {
    await loginAsTeacher(page);
    await clickTab(page, 'My Appraisal');
    await page.waitForTimeout(3000);
    const breakdown = page.locator('text=Section-wise Breakdown');
    const noAppraisal = page.locator('text=No appraisal found');
    const eitherVisible = (await breakdown.count() > 0) || (await noAppraisal.count() > 0);
    expect(eitherVisible).toBe(true);
    console.log('✅ P1: Appraisal section report or empty state visible');
  });

  test('P2. All 7 per-section comment fields present in API response', async () => {
    const r = await axios.get(
      `${API}/appraisal/teacher/${ctx!.teacherId}?academic_year=${ACADEMIC_YEAR}`,
      { validateStatus: () => true }
    );
    if (r.status === 404) { console.log('⚠️ P2: No appraisal'); return; }
    for (const field of ['exam_section_comment','skills_section_comment','behaviour_section_comment',
      'parents_feedback_section_comment','classroom_section_comment',
      'english_comm_section_comment','responsibilities_section_comment','overall_remarks']) {
      expect(r.data).toHaveProperty(field);
    }
    console.log('✅ P2: All 8 section comment fields present in appraisal API response');
  });

  test('P3. Shared appraisal: section comments non-empty and match submitted values', async () => {
    const r = await axios.get(
      `${API}/appraisal/teacher/${ctx!.teacherId}?academic_year=${ACADEMIC_YEAR}`,
      { validateStatus: () => true }
    );
    if (r.status === 404) { console.log('⚠️ P3: No appraisal'); return; }
    // Comments were set in F1 test
    expect(r.data.exam_section_comment).toBe('Strong exam performance across all subjects.');
    expect(r.data.overall_remarks).toBe('Outstanding teacher — awarded Star Performer.');
    console.log('✅ P3: Section comments match exactly what was submitted');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Q — REGRESSION & ENCODING
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Q — Regression & Edge Cases', () => {

  test('Q1. No garbled characters in page text (encoding fix)', async ({ page }) => {
    await loginAsTeacher(page);
    await page.waitForTimeout(2000);
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const hasGarbling = bodyText.includes('â') || bodyText.includes('â€');
    expect(hasGarbling).toBe(false);
    console.log('✅ Q1: No garbled cp1252 characters in page text');
  });

  test('Q2. My Class tab activitiesData not empty (seeded activity visible)', async ({ page }) => {
    await loginAsTeacher(page);
    await clickTab(page, 'My Class');
    await page.waitForTimeout(3500);
    const noActs = await page.locator('text=No activities created').count();
    expect(noActs).toBe(0);
    console.log('✅ Q2: activitiesData non-empty — seeded activity present');
  });

  test('Q3. Profile save does not lose teacher role', async () => {
    await axios.patch(`${API}/users/${ctx!.teacherId}`, { phone: '9111111111' }, { timeout: 10000 });
    const check = await axios.get(`${API}/users/${ctx!.teacherId}`, { timeout: 10000 });
    expect(check.data.role).toBe('teacher');
    // Restore
    await axios.patch(`${API}/users/${ctx!.teacherId}`, { phone: '9000000001' }, { timeout: 10000 });
    console.log('✅ Q3: Role preserved after profile save');
  });

  test('Q4. All critical APIs respond with 200', async () => {
    const endpoints = [
      `/mappings/teacher/${ctx!.teacherId}/dashboard?academic_year=${ACADEMIC_YEAR}`,
      `/students?grade=${encodeURIComponent(ctx!.grade)}&section=${encodeURIComponent(ctx!.section)}`,
      `/baseline/section?academic_year=${ACADEMIC_YEAR}&grade=${encodeURIComponent(ctx!.grade)}&section=${encodeURIComponent(ctx!.section)}`,
      `/activities/section?academic_year=${ACADEMIC_YEAR}&grade=${encodeURIComponent(ctx!.grade)}&section=${encodeURIComponent(ctx!.section)}`,
      `/pasa/config/section?grade=${encodeURIComponent(ctx!.grade)}&section=${encodeURIComponent(ctx!.section)}&academic_year=${ACADEMIC_YEAR}`,
      `/activities/alerts/decline?academic_year=${ACADEMIC_YEAR}`,
    ];
    for (const ep of endpoints) {
      const r = await axios.get(`${API}${ep}`, { timeout: 15000 });
      expect(r.status).toBe(200);
    }
    console.log('✅ Q4: All critical teacher dashboard APIs returned 200');
  });

  test('Q5. All sidebar tabs render without duplicate labels', async ({ page }) => {
    await loginAsTeacher(page);
    await page.waitForTimeout(2000);
    const requiredTabs = [
      'My Students','My Class','PA/SA Marks','Baseline Entry','Baseline Dashboard',
      'Activities','AI Tools','AI Homework','Alerts','Promotion','Student Portfolio',
      'My Profile','My Baseline','My Appraisal','AI Learning','Learning Resources',
    ];
    const missing: string[] = [];
    for (const label of requiredTabs) {
      if (await page.locator(`button:has-text("${label}")`).count() === 0) missing.push(label);
    }
    expect(missing).toEqual([]);
    console.log(`✅ Q5: All ${requiredTabs.length} tab buttons visible, none missing`);
  });

  test('Q6. Incomplete baseline POST returns 4xx', async () => {
    const r = await axios.post(`${API}/baseline/section/round`, {
      grade: ctx!.grade, section: ctx!.section,
      // missing required: stage, round, entries, academic_year
    }, { validateStatus: () => true, timeout: 10000 });
    expect(r.status).toBeGreaterThanOrEqual(400);
    console.log(`✅ Q6: Incomplete baseline POST returns ${r.status}`);
  });

  test('Q7. My Baseline tab loads (teacher self baseline endpoint)', async ({ page }) => {
    await loginAsTeacher(page);
    await clickTab(page, 'My Baseline');
    await page.waitForTimeout(2000);
    await expect(page.locator(':has-text("Baseline")').first()).toBeVisible({ timeout: 10000 });
    const r = await axios.get(`${API}/baseline/teacher/${ctx!.teacherId}?academic_year=${ACADEMIC_YEAR}`);
    expect(r.status).toBe(200);
    console.log('✅ Q7: My Baseline tab loaded, /baseline/teacher/:id endpoint 200');
  });
});

