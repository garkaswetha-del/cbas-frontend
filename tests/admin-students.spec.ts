import { test, expect } from '@playwright/test';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Admin → Students Tab — Full E2E Workflow Tests
//
// Covers the complete student lifecycle:
//   ST1  — Create student: all fields stored correctly in DB
//   ST2  — GET by ID: correct data returned
//   ST3  — Filter by grade + section: only matching students returned
//   ST4  — Search by name: ILIKE search returns matching student
//   ST5  — Edit student: PATCH fields persisted in DB
//   ST6  — Stats: /students/stats returns valid structure
//   ST7  — Issue TC: is_active=false, tc_date set, in TC register, absent from active
//   ST8  — Bulk import: creates new, updates existing with matched fields
//   ST9  — Promotion preview: returns correct next grade and student list
//   ST10 — Execute promotion: student moves to next grade + new section
//   ST11 — Permanent delete: student completely removed
//
// Uses real API — no mocks. Seeds fresh data, verifies stored values,
// tests TC workflow, promotion chain. Cleans up on completion.
// ─────────────────────────────────────────────────────────────────────────────

const API = 'https://cbas-backend-production.up.railway.app';

test.describe.configure({ retries: 0 });

const TEST_GRADE    = 'Grade 8';
const NEXT_GRADE    = 'Grade 9';          // expected promotion target
const TEST_SECTION  = 'TESTE2EPROM';      // unique section — no real students
const TEST_NAME     = `E2EStudent_${Date.now()}`;
const TEST_ADM_NO   = `E2E${Date.now().toString().slice(-6)}`;

let createdStudentId  = '';
let bulkStudentId     = '';

// ─────────────────────────────────────────────────────────────────────────────
// CLEANUP — runs even if tests fail
// ─────────────────────────────────────────────────────────────────────────────
test.afterAll(async () => {
  for (const id of [createdStudentId, bulkStudentId]) {
    if (!id) continue;
    await axios.delete(`${API}/students/${id}/permanent`, { validateStatus: () => true, timeout: 10000 });
    console.log(`🧹 Cleanup: permanently deleted student ${id}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────

test('ST1 — Create student: all fields stored correctly in DB', async () => {
  const payload = {
    name:             TEST_NAME,
    admission_no:     TEST_ADM_NO,
    current_class:    TEST_GRADE,
    section:          TEST_SECTION,
    gender:           'Male',
    dob:              '2010-06-15',
    admission_year:   '2020',
    father_name:      'E2E Father',
    mother_name:      'E2E Mother',
    parent_phone:     '9999988888',
    address:          '123 Test Street',
    father_qualification:  'Graduate',
    mother_qualification:  'Graduate',
    father_working_status: 'Working',
    mother_working_status: 'Working',
  };

  const createR = await axios.post(`${API}/students`, payload, { timeout: 15000 });
  expect([200, 201]).toContain(createR.status);

  const s = createR.data;
  createdStudentId = s.id;
  expect(createdStudentId).toBeTruthy();

  expect(s.name).toBe(TEST_NAME);
  expect(s.admission_no).toBe(TEST_ADM_NO);
  expect(s.current_class).toBe(TEST_GRADE);
  expect(s.section).toBe(TEST_SECTION);
  expect(s.gender).toBe('Male');
  expect(s.dob).toBe('2010-06-15');
  expect(s.father_name).toBe('E2E Father');
  expect(s.mother_name).toBe('E2E Mother');
  expect(s.father_qualification).toBe('Graduate');
  expect(s.mother_qualification).toBe('Graduate');
  expect(s.is_active).toBe(true);
  expect(s.is_graduated).toBe(false);

  // Must appear in active list
  const listR = await axios.get(`${API}/students`, { timeout: 15000 });
  const inList = (listR.data || []).find((st: any) => st.id === createdStudentId);
  expect(inList).toBeDefined();
  expect(inList.name).toBe(TEST_NAME);

  console.log(`✅ ST1: Created student ${createdStudentId} — all fields stored, appears in active list`);
});

test('ST2 — GET by ID: correct data returned from /students/:id', async () => {
  expect(createdStudentId).toBeTruthy();

  const getR = await axios.get(`${API}/students/${createdStudentId}`, { timeout: 15000 });
  expect(getR.status).toBe(200);

  const s = getR.data;
  expect(s.id).toBe(createdStudentId);
  expect(s.name).toBe(TEST_NAME);
  expect(s.admission_no).toBe(TEST_ADM_NO);
  expect(s.current_class).toBe(TEST_GRADE);
  expect(s.section).toBe(TEST_SECTION);
  expect(s.father_qualification).toBe('Graduate');
  expect(s.is_active).toBe(true);

  console.log(`✅ ST2: GET /students/:id returns correct data — name="${s.name}", class="${s.current_class}/${s.section}"`);
});

test('ST3 — Filter by grade + section: only matching students returned', async () => {
  expect(createdStudentId).toBeTruthy();

  // Filter by grade + exact test section (unique, only our student is in it)
  const filterR = await axios.get(
    `${API}/students?grade=${encodeURIComponent(TEST_GRADE)}&section=${encodeURIComponent(TEST_SECTION)}`,
    { timeout: 15000 }
  );
  expect(filterR.status).toBe(200);
  const results: any[] = filterR.data || [];

  // All returned students must be in the right grade + section
  results.forEach(s => {
    expect(s.current_class.toLowerCase()).toBe(TEST_GRADE.toLowerCase());
    expect(s.section.toUpperCase()).toBe(TEST_SECTION.toUpperCase());
  });

  // Our test student must be in the results
  const mine = results.find((s: any) => s.id === createdStudentId);
  expect(mine).toBeDefined();

  // Filter by wrong grade must NOT return our student
  const wrongR = await axios.get(
    `${API}/students?grade=Grade%201&section=${encodeURIComponent(TEST_SECTION)}`,
    { timeout: 15000 }
  );
  const wrongList = (wrongR.data || []).find((s: any) => s.id === createdStudentId);
  expect(wrongList).toBeUndefined();

  console.log(`✅ ST3: Grade/section filter returns ${results.length} student(s) in ${TEST_GRADE}/${TEST_SECTION}`);
});

test('ST4 — Search by name: ILIKE search returns matching student', async () => {
  expect(createdStudentId).toBeTruthy();

  // Use a unique prefix from the name
  const searchTerm = TEST_NAME.slice(0, 12); // e.g. "E2EStudent_1"
  const searchR = await axios.get(
    `${API}/students?search=${encodeURIComponent(searchTerm)}`,
    { timeout: 15000 }
  );
  expect(searchR.status).toBe(200);

  const results: any[] = searchR.data || [];
  const found = results.find((s: any) => s.id === createdStudentId);
  expect(found).toBeDefined();
  expect(found.name).toBe(TEST_NAME);

  // Gibberish search must return empty
  const emptyR = await axios.get(`${API}/students?search=XXXNOMATCHZZZ`, { timeout: 15000 });
  expect((emptyR.data || []).length).toBe(0);

  console.log(`✅ ST4: Search "${searchTerm}" found student "${found.name}"`);
});

test('ST5 — Edit student: PATCH fields persisted in DB', async () => {
  expect(createdStudentId).toBeTruthy();

  const UPDATED_NAME    = `${TEST_NAME}_updated`;
  const UPDATED_PHONE   = '8888877777';
  const UPDATED_ADDRESS = '456 Updated Avenue';
  const UPDATED_QUAL    = 'Non-Graduate';

  const patchR = await axios.patch(`${API}/students/${createdStudentId}`, {
    name:              UPDATED_NAME,
    phone:             UPDATED_PHONE,
    address:           UPDATED_ADDRESS,
    father_qualification: UPDATED_QUAL,
  }, { timeout: 15000 });
  expect(patchR.status).toBe(200);

  // Re-fetch and verify
  const getR = await axios.get(`${API}/students/${createdStudentId}`, { timeout: 15000 });
  const s = getR.data;
  expect(s.name).toBe(UPDATED_NAME);
  expect(s.phone).toBe(UPDATED_PHONE);
  expect(s.address).toBe(UPDATED_ADDRESS);
  expect(s.father_qualification).toBe(UPDATED_QUAL);
  // Unchanged fields must still be there
  expect(s.admission_no).toBe(TEST_ADM_NO);
  expect(s.current_class).toBe(TEST_GRADE);

  console.log(`✅ ST5: Edit verified — name="${UPDATED_NAME}", phone="${UPDATED_PHONE}", qualification="${UPDATED_QUAL}"`);
});

test('ST6 — Stats: /students/stats returns valid structure with totals', async () => {
  const statsR = await axios.get(`${API}/students/stats`, { timeout: 15000 });
  expect(statsR.status).toBe(200);

  const stats = statsR.data;
  expect(typeof stats.total).toBe('number');
  expect(stats.total).toBeGreaterThan(0);
  expect(Array.isArray(stats.byGrade)).toBe(true);
  expect(Array.isArray(stats.byGender)).toBe(true);
  expect(typeof stats.tcCount).toBe('number');

  // byGrade entries must have grade + count
  stats.byGrade.forEach((g: any) => {
    expect(g.grade).toBeTruthy();
    expect(Number(g.count)).toBeGreaterThanOrEqual(0);
  });

  // Our test grade must appear (we added a student there)
  const testGradeEntry = stats.byGrade.find((g: any) => g.grade === TEST_GRADE);
  expect(testGradeEntry).toBeDefined();

  console.log(`✅ ST6: /students/stats — total=${stats.total}, grades=${stats.byGrade.length}, tcCount=${stats.tcCount}`);
});

test('ST7 — Issue TC: is_active=false, tc_date set, in TC register, absent from active list', async () => {
  expect(createdStudentId).toBeTruthy();

  const TC_DATE   = '2026-05-06';
  const TC_REASON = 'E2E test TC';

  const tcR = await axios.patch(
    `${API}/students/${createdStudentId}/tc`,
    { tc_date: TC_DATE, tc_reason: TC_REASON },
    { timeout: 15000 }
  );
  expect(tcR.status).toBe(200);

  // GET /:id shows is_active=false, tc_date set
  const getR = await axios.get(`${API}/students/${createdStudentId}`, { timeout: 15000 });
  const s = getR.data;
  expect(s.is_active).toBe(false);
  expect(s.tc_date).toBe(TC_DATE);
  expect(s.tc_reason).toBe(TC_REASON);
  expect(s.is_graduated).toBe(false);

  // Must appear in TC register
  const tcRegR = await axios.get(`${API}/students/tc-register`, { timeout: 15000 });
  const inReg = (tcRegR.data || []).find((st: any) => st.id === createdStudentId);
  expect(inReg).toBeDefined();
  expect(inReg.tc_date).toBe(TC_DATE);

  // Must NOT appear in default active list
  const activeR = await axios.get(`${API}/students`, { timeout: 15000 });
  const inActive = (activeR.data || []).find((st: any) => st.id === createdStudentId);
  expect(inActive).toBeUndefined();

  // Must appear when include_inactive=true
  const allR = await axios.get(`${API}/students?include_inactive=true`, { timeout: 15000 });
  const inAll = (allR.data || []).find((st: any) => st.id === createdStudentId);
  expect(inAll).toBeDefined();

  console.log(`✅ ST7: TC issued — is_active=false, tc_date="${TC_DATE}", in TC register, absent from active list`);
});

test('ST8 — Bulk import: creates new student, recognizes duplicate by name+class', async () => {
  // Create a fresh student via bulk import
  const BULK_NAME = `E2EBulk_${Date.now()}`;
  const importR = await axios.post(`${API}/students/bulk-import`, {
    students: [
      {
        name:          BULK_NAME,
        current_class: TEST_GRADE,
        section:       TEST_SECTION,
        gender:        'Female',
        admission_no:  `BLK${Date.now().toString().slice(-5)}`,
      },
    ],
  }, { timeout: 15000 });

  expect([200, 201]).toContain(importR.status);
  expect(importR.data.created).toBe(1);
  expect(importR.data.errors.length).toBe(0);

  // Find the created student
  const listR = await axios.get(
    `${API}/students?grade=${encodeURIComponent(TEST_GRADE)}&section=${encodeURIComponent(TEST_SECTION)}&include_inactive=true`,
    { timeout: 15000 }
  );
  const bulk = (listR.data || []).find((s: any) => s.name === BULK_NAME);
  expect(bulk).toBeDefined();
  bulkStudentId = bulk.id;

  // Re-import same student — should update (count as updated, not created)
  const reimportR = await axios.post(`${API}/students/bulk-import`, {
    students: [
      {
        name:          BULK_NAME,
        current_class: TEST_GRADE,
        section:       TEST_SECTION,
        gender:        'Female',
        father_name:   'Updated Father', // new field value
      },
    ],
  }, { timeout: 15000 });

  expect([200, 201]).toContain(reimportR.status);
  expect(reimportR.data.updated).toBe(1);
  expect(reimportR.data.created).toBe(0);

  // Verify the update persisted
  const getR = await axios.get(`${API}/students/${bulkStudentId}`, { timeout: 15000 });
  expect(getR.data.father_name).toBe('Updated Father');

  console.log(`✅ ST8: Bulk import — created=${importR.data.created}, reimport updated=${reimportR.data.updated}, fields persisted`);
});

test('ST9 — Promotion preview: returns correct next grade and student list', async () => {
  // Use a real grade/section that has students for a meaningful preview
  // First find any grade+section combo with active students
  const statsR = await axios.get(`${API}/students/stats`, { timeout: 15000 });
  const byGrade: any[] = statsR.data?.byGrade || [];

  // Pick any non-final grade with students (not Grade 10)
  const gradeEntry = byGrade.find((g: any) => g.grade !== 'Grade 10' && parseInt(g.count) > 0);
  if (!gradeEntry) { console.log('⚠️  ST9: No promotable grades found — skip'); return; }

  const grade = gradeEntry.grade;
  // Get sections for this grade
  const secR = await axios.get(`${API}/students/sections/${encodeURIComponent(grade)}`, { timeout: 15000 });
  const sections: string[] = secR.data?.sections || [];
  if (sections.length === 0) { console.log('⚠️  ST9: No sections found — skip'); return; }
  const section = sections[0];

  const prevR = await axios.get(
    `${API}/students/promotion/preview?grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`,
    { timeout: 15000 }
  );
  expect(prevR.status).toBe(200);

  const preview = prevR.data;
  expect(preview.current_grade).toBe(grade);
  expect(preview.current_section).toBe(section);
  expect(preview.next_grade).toBeTruthy();
  expect(typeof preview.student_count).toBe('number');
  expect(Array.isArray(preview.students)).toBe(true);
  expect(preview.students.length).toBe(preview.student_count);

  // Each student entry must have id, name, promoted_to
  preview.students.forEach((s: any) => {
    expect(s.id).toBeTruthy();
    expect(s.name).toBeTruthy();
    expect(s.promoted_to).toBe(preview.next_grade);
  });

  console.log(`✅ ST9: Promotion preview for ${grade}/${section} — ${preview.student_count} students → ${preview.next_grade}`);
});

test('ST10 — Execute promotion: test student moves to next grade + new section', async () => {
  // Create a fresh student in Grade 8 to promote
  const PROM_NAME = `E2EPromote_${Date.now()}`;
  const createR = await axios.post(`${API}/students`, {
    name:          PROM_NAME,
    current_class: 'Grade 8',
    section:       TEST_SECTION,
    gender:        'Male',
  }, { timeout: 15000 });
  expect([200, 201]).toContain(createR.status);
  const promId = createR.data.id;
  expect(promId).toBeTruthy();

  try {
    // Execute promotion for just this one student
    const promR = await axios.post(`${API}/students/promotion/execute`, {
      grade:       'Grade 8',
      section:     TEST_SECTION,
      new_section: TEST_SECTION,  // same section name, just new grade
      student_ids: [promId],
    }, { timeout: 15000 });

    expect([200, 201]).toContain(promR.status);
    const result = promR.data;
    expect(result.success).toBe(true);
    expect(result.promoted_count).toBe(1);
    expect(result.from_grade).toBe('Grade 8');
    expect(result.to_grade).toBe('Grade 9');

    // Verify the student's grade actually changed in DB
    const getR = await axios.get(`${API}/students/${promId}`, { timeout: 15000 });
    expect(getR.data.current_class).toBe('Grade 9');
    expect(getR.data.section).toBe(TEST_SECTION);

    console.log(`✅ ST10: Promoted "${PROM_NAME}" from Grade 8/${TEST_SECTION} → Grade 9/${TEST_SECTION}`);
  } finally {
    // Always clean up this temporary promotion student
    await axios.delete(`${API}/students/${promId}/permanent`, { validateStatus: () => true, timeout: 10000 });
  }
});

test('ST11 — Permanent delete: student completely removed, GET returns 404', async () => {
  expect(createdStudentId).toBeTruthy();

  const deleteR = await axios.delete(`${API}/students/${createdStudentId}/permanent`, { timeout: 15000 });
  expect(deleteR.status).toBe(200);

  // GET /:id must 404
  const getR = await axios.get(`${API}/students/${createdStudentId}`, {
    timeout: 15000, validateStatus: () => true,
  });
  expect(getR.status).toBe(404);

  // Must NOT appear in any list (active or inactive)
  const allR = await axios.get(`${API}/students?include_inactive=true`, { timeout: 15000 });
  const inAll = (allR.data || []).find((s: any) => s.id === createdStudentId);
  expect(inAll).toBeUndefined();

  // Must NOT appear in TC register
  const tcR = await axios.get(`${API}/students/tc-register`, { timeout: 15000 });
  const inTC = (tcR.data || []).find((s: any) => s.id === createdStudentId);
  expect(inTC).toBeUndefined();

  createdStudentId = ''; // prevent afterAll from trying again
  console.log(`✅ ST11: Permanently deleted — GET returns 404, absent from all lists`);
});
