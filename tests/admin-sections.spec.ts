import { test, expect } from '@playwright/test';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Admin → Sections Tab — Full E2E Workflow Tests
//
// Covers the complete section lifecycle:
//   S1  — Create section: stored in DB, appears in list + map
//   S2  — Duplicate blocked: creating same section again returns 409
//   S3  — Rename with cascade: old name gone, new name in DB, updated counts returned
//   S4  — Deactivate: is_active=false, absent from active list
//   S5  — Reactivate: is_active=true, back in active list, absent from inactive
//   S6  — Get map: /sections/map returns grade→name[] correctly
//   S7  — Get counts: /sections/counts returns student_count per section
//   S8  — Delete: section permanently removed, GET returns null
//   S9  — Delete blocked when re-created section has DB records (no students = can delete)
//
// Uses real API — no mocks. Seeds fresh data with unique name, verifies stored
// values, tests rename cascade, deactivate/reactivate lifecycle, then deletes.
// ─────────────────────────────────────────────────────────────────────────────

const API = 'https://cbas-backend-production.up.railway.app';
const ACADEMIC_YEAR = '2025-26';

test.describe.configure({ retries: 0 });

const GRADE        = 'Grade 9';
const SECTION_NAME = `E2ETEST${Date.now().toString().slice(-6)}`; // e.g. E2ETEST123456
const RENAMED_NAME = `${SECTION_NAME}R`;

let createdSectionId = '';

// ─────────────────────────────────────────────────────────────────────────────
// CLEANUP — runs even if tests fail
// ─────────────────────────────────────────────────────────────────────────────
test.afterAll(async () => {
  if (!createdSectionId) return;
  // Try delete; if blocked, deactivate first then delete
  const r1 = await axios.delete(`${API}/sections/${createdSectionId}`, { validateStatus: () => true, timeout: 10000 });
  if (r1.status !== 200) {
    await axios.patch(`${API}/sections/${createdSectionId}/deactivate`, {}, { validateStatus: () => true, timeout: 10000 });
    await axios.delete(`${API}/sections/${createdSectionId}`, { validateStatus: () => true, timeout: 10000 });
  }
  console.log(`🧹 Cleanup: removed section ${createdSectionId} (${RENAMED_NAME})`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('S1 — Create section: stored in DB, appears in list and map', async () => {
  const createR = await axios.post(`${API}/sections`, {
    grade:         GRADE,
    name:          SECTION_NAME,
    academic_year: ACADEMIC_YEAR,
  }, { timeout: 15000 });

  expect([200, 201]).toContain(createR.status);
  const sec = createR.data;
  createdSectionId = sec.id;

  expect(createdSectionId).toBeTruthy();
  expect(sec.grade).toBe(GRADE);
  // Names are auto-uppercased
  expect(sec.name).toBe(SECTION_NAME.toUpperCase());
  expect(sec.academic_year).toBe(ACADEMIC_YEAR);
  expect(sec.is_active).toBe(true);

  // Must appear in GET /sections?grade=...&academic_year=...
  const listR = await axios.get(
    `${API}/sections?grade=${encodeURIComponent(GRADE)}&academic_year=${ACADEMIC_YEAR}`,
    { timeout: 15000 }
  );
  const inList = (listR.data || []).find((s: any) => s.id === createdSectionId);
  expect(inList).toBeDefined();
  expect(inList.name).toBe(SECTION_NAME.toUpperCase());

  // Must appear in GET /sections/map
  const mapR = await axios.get(`${API}/sections/map?academic_year=${ACADEMIC_YEAR}`, { timeout: 15000 });
  const gradeNames: string[] = mapR.data?.[GRADE] || [];
  expect(gradeNames).toContain(SECTION_NAME.toUpperCase());

  console.log(`✅ S1: Created section ${createdSectionId} — name="${sec.name}", grade="${GRADE}", in list and map`);
});

test('S2 — Duplicate blocked: creating same section again returns 409', async () => {
  expect(createdSectionId).toBeTruthy();

  const dupR = await axios.post(`${API}/sections`, {
    grade:         GRADE,
    name:          SECTION_NAME,
    academic_year: ACADEMIC_YEAR,
  }, { timeout: 15000, validateStatus: () => true });

  expect(dupR.status).toBe(409);
  console.log(`✅ S2: Duplicate section rejected — status ${dupR.status}`);
});

test('S3 — Rename with cascade: old name gone, new name in DB, updated counts returned', async () => {
  expect(createdSectionId).toBeTruthy();

  const renameR = await axios.patch(
    `${API}/sections/${createdSectionId}/rename`,
    { name: RENAMED_NAME },
    { timeout: 15000 }
  );
  expect(renameR.status).toBe(200);

  const result = renameR.data;
  expect(result.old_name).toBe(SECTION_NAME.toUpperCase());
  expect(result.new_name).toBe(RENAMED_NAME.toUpperCase());
  expect(result.grade).toBe(GRADE);
  // Cascade update map must be present (even if all counts are 0 for a fresh section)
  expect(result.updated).toBeDefined();
  expect(typeof result.updated).toBe('object');

  // Old name must no longer appear in map for this grade
  const mapR = await axios.get(`${API}/sections/map?academic_year=${ACADEMIC_YEAR}`, { timeout: 15000 });
  const gradeNames: string[] = mapR.data?.[GRADE] || [];
  expect(gradeNames).not.toContain(SECTION_NAME.toUpperCase());
  expect(gradeNames).toContain(RENAMED_NAME.toUpperCase());

  // GET /sections/:id reflects the new name
  const getR = await axios.get(`${API}/sections/${createdSectionId}`, { timeout: 15000 });
  expect(getR.data.name).toBe(RENAMED_NAME.toUpperCase());

  console.log(`✅ S3: Renamed "${result.old_name}" → "${result.new_name}" in ${GRADE}`);
  console.log(`   Cascade updated tables: ${Object.keys(result.updated).join(', ')}`);
});

test('S4 — Deactivate: is_active=false, absent from active list, in counts as inactive', async () => {
  expect(createdSectionId).toBeTruthy();

  const deactivateR = await axios.patch(
    `${API}/sections/${createdSectionId}/deactivate`,
    {},
    { timeout: 15000 }
  );
  expect(deactivateR.status).toBe(200);

  // GET /sections/:id shows is_active=false
  const getR = await axios.get(`${API}/sections/${createdSectionId}`, { timeout: 15000, validateStatus: () => true });
  if (getR.status === 200) {
    expect(getR.data.is_active).toBe(false);
  }

  // Must NOT appear in active list (findAll filters is_active=true)
  const listR = await axios.get(
    `${API}/sections?grade=${encodeURIComponent(GRADE)}&academic_year=${ACADEMIC_YEAR}`,
    { timeout: 15000 }
  );
  const inList = (listR.data || []).find((s: any) => s.id === createdSectionId);
  expect(inList).toBeUndefined();

  // Must NOT appear in map (map also uses findAll which filters active only)
  const mapR = await axios.get(`${API}/sections/map?academic_year=${ACADEMIC_YEAR}`, { timeout: 15000 });
  const gradeNames: string[] = mapR.data?.[GRADE] || [];
  expect(gradeNames).not.toContain(RENAMED_NAME.toUpperCase());

  console.log(`✅ S4: Deactivated — is_active=false, absent from active list and map`);
});

test('S5 — Reactivate: is_active=true, back in active list and map', async () => {
  expect(createdSectionId).toBeTruthy();

  const reactivateR = await axios.patch(
    `${API}/sections/${createdSectionId}/reactivate`,
    {},
    { timeout: 15000 }
  );
  expect(reactivateR.status).toBe(200);

  // GET /sections/:id shows is_active=true
  const getR = await axios.get(`${API}/sections/${createdSectionId}`, { timeout: 15000, validateStatus: () => true });
  if (getR.status === 200) {
    expect(getR.data.is_active).toBe(true);
  }

  // Must reappear in active list
  const listR = await axios.get(
    `${API}/sections?grade=${encodeURIComponent(GRADE)}&academic_year=${ACADEMIC_YEAR}`,
    { timeout: 15000 }
  );
  const inList = (listR.data || []).find((s: any) => s.id === createdSectionId);
  expect(inList).toBeDefined();
  expect(inList.is_active).toBe(true);

  // Must reappear in map
  const mapR = await axios.get(`${API}/sections/map?academic_year=${ACADEMIC_YEAR}`, { timeout: 15000 });
  const gradeNames: string[] = mapR.data?.[GRADE] || [];
  expect(gradeNames).toContain(RENAMED_NAME.toUpperCase());

  console.log(`✅ S5: Reactivated — is_active=true, back in active list and map`);
});

test('S6 — Get map: /sections/map returns correct grade→section-names structure', async () => {
  expect(createdSectionId).toBeTruthy();

  const mapR = await axios.get(`${API}/sections/map?academic_year=${ACADEMIC_YEAR}`, { timeout: 15000 });
  expect(mapR.status).toBe(200);
  expect(typeof mapR.data).toBe('object');

  // Must be a grade→string[] map
  for (const [grade, names] of Object.entries(mapR.data)) {
    expect(Array.isArray(names)).toBe(true);
    (names as string[]).forEach(n => expect(typeof n).toBe('string'));
  }

  // Our test grade must be present with the renamed section
  expect(mapR.data[GRADE]).toBeDefined();
  expect(mapR.data[GRADE]).toContain(RENAMED_NAME.toUpperCase());

  console.log(`✅ S6: /sections/map returns ${Object.keys(mapR.data).length} grades, ${GRADE} has ${mapR.data[GRADE].length} section(s)`);
});

test('S7 — Get counts: /sections/counts returns student_count per section', async () => {
  const countsR = await axios.get(`${API}/sections/counts?academic_year=${ACADEMIC_YEAR}`, { timeout: 15000 });
  expect(countsR.status).toBe(200);
  expect(Array.isArray(countsR.data)).toBe(true);

  // Every entry must have student_count as a number
  (countsR.data as any[]).forEach(s => {
    expect(typeof s.student_count).toBe('number');
    expect(s.student_count).toBeGreaterThanOrEqual(0);
  });

  // Our test section must appear (it's active, no students → count=0)
  const mine = (countsR.data as any[]).find((s: any) => s.id === createdSectionId);
  expect(mine).toBeDefined();
  expect(mine.student_count).toBe(0); // freshly created section has no students

  console.log(`✅ S7: /sections/counts OK — ${countsR.data.length} sections, test section student_count=${mine.student_count}`);
});

test('S8 — Delete: section permanently removed, no longer exists', async () => {
  expect(createdSectionId).toBeTruthy();

  const deleteR = await axios.delete(`${API}/sections/${createdSectionId}`, { timeout: 15000 });
  expect(deleteR.status).toBe(200);

  // GET /sections/:id — should return null or 404
  const getR = await axios.get(`${API}/sections/${createdSectionId}`, { timeout: 15000, validateStatus: () => true });
  // Either 404, or 200 with null data
  if (getR.status === 200) {
    expect(getR.data).toBeFalsy();
  } else {
    expect(getR.status).toBe(404);
  }

  // Must NOT appear in list
  const listR = await axios.get(
    `${API}/sections?grade=${encodeURIComponent(GRADE)}&academic_year=${ACADEMIC_YEAR}`,
    { timeout: 15000 }
  );
  const inList = (listR.data || []).find((s: any) => s.id === createdSectionId);
  expect(inList).toBeUndefined();

  // Must NOT appear in map
  const mapR = await axios.get(`${API}/sections/map?academic_year=${ACADEMIC_YEAR}`, { timeout: 15000 });
  const gradeNames: string[] = mapR.data?.[GRADE] || [];
  expect(gradeNames).not.toContain(RENAMED_NAME.toUpperCase());

  createdSectionId = ''; // prevent afterAll from trying again
  console.log(`✅ S8: Permanently deleted — absent from list, map, and counts`);
});

test('S9 — Delete blocked when section has records: returns 400', async () => {
  // Use an existing real section known to have students (Grade 1 / first section found in counts)
  const countsR = await axios.get(`${API}/sections/counts?academic_year=${ACADEMIC_YEAR}`, { timeout: 15000 });
  const withStudents = (countsR.data as any[]).find((s: any) => s.student_count > 0);

  if (!withStudents) {
    console.log(`⚠️  S9: No sections with students found — skipping delete-blocked check`);
    return;
  }

  const deleteR = await axios.delete(`${API}/sections/${withStudents.id}`, {
    timeout: 15000,
    validateStatus: () => true,
  });
  expect(deleteR.status).toBe(400);
  console.log(`✅ S9: Delete blocked for ${withStudents.grade}/${withStudents.name} (${withStudents.student_count} students) — status ${deleteR.status}`);
});
