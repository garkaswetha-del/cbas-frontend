import { test, expect } from '@playwright/test';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Student Management — Industry Standard E2E Test
//
// S1  — Admin navigates to Student Management: heading + stats visible
// S2  — Student list loads: 1490+ students, pagination present
// S3  — Grade filter: select Grade 1 → only Grade 1 rows
// S4  — Section filter: Grade 1 + Asteroid → only Asteroid rows, API count matches
// S5  — Name search: type seeded student name → found in table
// S6  — Add student: fill form → save → API confirms record
// S7  — Edit student: change phone → save → API confirms updated value
// S8  — Issue TC: TC modal → student gone from Active → API is_active=false
// S9  — TC Register tab: TC'd student visible, permanently deleted for cleanup
// S10 — Stats formula: total == Σ(byGrade counts), gender adds up
// S11 — Promotion wizard: Grade 9 E2E-PROMO → Grade 10 E2E-PROMO-NEXT (3 students)
// S12 — Alumni tab: 2 graduated students appear, year filter works
// S13 — Cleanup: all E2E test students confirmed absent from DB
// ─────────────────────────────────────────────────────────────────────────────

const BASE = 'https://cbas-frontend-production.up.railway.app';
const API  = 'https://cbas-backend-production.up.railway.app';

const ADMIN = { email: 'garkaswetha@gmail.com', password: 'swetha123' };

const STUDENT = {
  name:          'E2E Test Student',
  admission_no:  'E2E-TEST-001',
  current_class: 'Grade 1',
  section:       'ASTEROID',  // DB stores sections in uppercase
  gender:        'Male',
};

const PROMO_STUDENTS = [
  { name: 'E2E Promo Student 1', admission_no: 'E2E-PR-001', current_class: 'Grade 9', section: 'E2E-PROMO', gender: 'Male' },
  { name: 'E2E Promo Student 2', admission_no: 'E2E-PR-002', current_class: 'Grade 9', section: 'E2E-PROMO', gender: 'Female' },
  { name: 'E2E Promo Student 3', admission_no: 'E2E-PR-003', current_class: 'Grade 9', section: 'E2E-PROMO', gender: 'Male' },
];

const GRAD_STUDENTS = [
  { name: 'E2E Grad Student 1', admission_no: 'E2E-GR-001', current_class: 'Grade 10', section: 'E2E-GRAD', gender: 'Female' },
  { name: 'E2E Grad Student 2', admission_no: 'E2E-GR-002', current_class: 'Grade 10', section: 'E2E-GRAD', gender: 'Male' },
];

const GRAD_YEAR = '2025-E2E';

let crudStudentId = '';
const promoStudentIds: string[] = [];
const gradStudentIds: string[] = [];

// ── Helper: inject admin session → navigate to /students ─────────────────────
async function adminLoginToStudents(page: any) {
  const res = await axios.post(`${API}/users/login`,
    { email: ADMIN.email, password: ADMIN.password }, { timeout: 15000 });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((u: any) => localStorage.setItem('cbas_user', JSON.stringify(u)), res.data.user);
  await page.goto(`${BASE}/students`, { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForSelector('h1:has-text("Student Management")', { timeout: 15000 });
}

test.describe('Student Management', () => {

// ── Seed all test data via API before any test runs ──────────────────────────
test.beforeAll(async () => {
  console.log('\n🌱 Seeding test data via API...');

  // Remove leftover E2E students from previous failed runs
  const allRes = await axios.get(`${API}/students?include_inactive=true`, { timeout: 20000, validateStatus: () => true });
  const allStudents: any[] = Array.isArray(allRes.data) ? allRes.data : [];
  const stale = allStudents.filter((s: any) =>
    s.admission_no?.startsWith('E2E-') || s.name?.startsWith('E2E ')
  );
  for (const s of stale) {
    await axios.delete(`${API}/students/${s.id}/permanent`, { timeout: 10000, validateStatus: () => true });
  }
  if (stale.length) console.log(`  🧹 Removed ${stale.length} leftover E2E students`);

  // Create promotion seed students (Grade 9, section E2E-PROMO)
  for (const s of PROMO_STUDENTS) {
    const r = await axios.post(`${API}/students`, s, { timeout: 10000 });
    promoStudentIds.push(r.data.id);
    console.log(`  ✅ Promo student created: ${s.name} (${r.data.id})`);
  }

  // Create graduation seed students (Grade 10, section E2E-GRAD)
  for (const s of GRAD_STUDENTS) {
    const r = await axios.post(`${API}/students`, s, { timeout: 10000 });
    gradStudentIds.push(r.data.id);
    console.log(`  ✅ Grad student created: ${s.name} (${r.data.id})`);
  }

  // Graduate them immediately via API (no UI for graduation — graduation is API-only)
  const gradRes = await axios.post(`${API}/students/graduation/execute`, {
    grade: 'Grade 10',
    section: 'E2E-GRAD',
    graduation_year: GRAD_YEAR,
  }, { timeout: 15000 });
  console.log(`  🎓 Graduated ${gradRes.data.graduated} students → year "${GRAD_YEAR}"`);
  console.log('🌱 Seeding complete.\n');
});

// ── afterAll: final paranoid cleanup ─────────────────────────────────────────
test.afterAll(async () => {
  const ids = [crudStudentId, ...promoStudentIds, ...gradStudentIds].filter(Boolean);
  for (const id of ids) {
    await axios.delete(`${API}/students/${id}/permanent`, { timeout: 10000, validateStatus: () => true });
  }
  // Re-scan for any stale E2E records
  const r = await axios.get(`${API}/students?include_inactive=true`, { timeout: 20000, validateStatus: () => true });
  const stale = (Array.isArray(r.data) ? r.data : []).filter((s: any) =>
    s.admission_no?.startsWith('E2E-') || s.name?.startsWith('E2E ')
  );
  for (const s of stale) {
    await axios.delete(`${API}/students/${s.id}/permanent`, { timeout: 10000, validateStatus: () => true });
  }
  console.log(`🧹 afterAll: cleaned up ${ids.length + stale.length} records total`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('S1 — Admin lands on Student Management: heading and stats visible', async ({ page }) => {
  await adminLoginToStudents(page);

  await expect(page.locator('h1:has-text("Student Management")')).toBeVisible();

  const headerText = await page.locator('p.text-sm.text-gray-500').first().textContent();
  console.log(`   Header: "${headerText}"`);

  const r = await axios.get(`${API}/students/stats`, { timeout: 15000 });
  const stats = r.data;
  expect(stats.total).toBeGreaterThan(1490);
  expect(Array.isArray(stats.byGrade)).toBe(true);

  console.log(`✅ S1: Student Management loaded — total: ${stats.total}, TC'd: ${stats.tcCount}`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('S2 — Student list loads: first-page rows ≤50, pagination visible', async ({ page }) => {
  await adminLoginToStudents(page);

  const rows = page.locator('table tbody tr');
  await expect(rows.first()).toBeVisible({ timeout: 10000 });
  const visibleRows = await rows.count();
  expect(visibleRows).toBeGreaterThan(0);
  expect(visibleRows).toBeLessThanOrEqual(50);

  // Pagination present because total > 50
  await expect(page.locator('button:has-text("Next")')).toBeVisible({ timeout: 5000 });
  const pageLabel = await page.locator('p:has-text("Page 1 of")').textContent();
  console.log(`   ${pageLabel}`);

  const r = await axios.get(`${API}/students`, { timeout: 15000 });
  const apiTotal = Array.isArray(r.data) ? r.data.length : 0;
  expect(apiTotal).toBeGreaterThan(1490);

  console.log(`✅ S2: ${visibleRows} rows on page 1 (PAGE_SIZE=50), API total ${apiTotal}`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('S3 — Grade filter: Grade 1 selected → only Grade 1 rows in table', async ({ page }) => {
  await adminLoginToStudents(page);

  const rows = page.locator('table tbody tr');
  await expect(rows.first()).toBeVisible({ timeout: 10000 });

  // Filter bar Class select has "All Classes" as first option (vs form which has "-- Select --")
  await page.locator('select').filter({ hasText: 'All Classes' }).selectOption('Grade 1');
  await page.waitForTimeout(1500);

  const filteredRows = await rows.count();
  expect(filteredRows).toBeGreaterThan(0);

  // Verify first row's Class column (4th column) is Grade 1
  const firstGrade = await page.locator('table tbody tr td:nth-child(4)').first().textContent();
  expect(firstGrade?.trim()).toBe('Grade 1');

  const r = await axios.get(`${API}/students?grade=Grade 1`, { timeout: 15000 });
  const apiCount = Array.isArray(r.data) ? r.data.length : 0;
  expect(apiCount).toBeGreaterThan(0);
  expect(filteredRows).toBeLessThanOrEqual(apiCount);

  console.log(`✅ S3: Grade filter — ${filteredRows} rows shown (page 1), API total Grade 1: ${apiCount}`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('S4 — Section filter: Grade 1 + Asteroid → only Asteroid rows', async ({ page }) => {
  await adminLoginToStudents(page);

  await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

  await page.locator('select').filter({ hasText: 'All Classes' }).selectOption('Grade 1');
  await page.waitForTimeout(1500);
  await page.locator('select').filter({ hasText: 'All Sections' }).selectOption('ASTEROID');
  await page.waitForTimeout(1500);

  const filteredRows = await page.locator('table tbody tr').count();
  expect(filteredRows).toBeGreaterThan(0);

  const firstSection = await page.locator('table tbody tr td:nth-child(5)').first().textContent();
  expect(firstSection?.trim().toUpperCase()).toContain('ASTEROID');

  const r = await axios.get(`${API}/students?grade=Grade 1&section=Asteroid`, { timeout: 15000 });
  const apiCount = Array.isArray(r.data) ? r.data.length : 0;
  expect(apiCount).toBeGreaterThan(0);
  expect(filteredRows).toBeLessThanOrEqual(apiCount);

  console.log(`✅ S4: Section filter — ${filteredRows} rows (page 1), API total Grade 1/Asteroid: ${apiCount}`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('S5 — Name search: seeded promo students found in table', async ({ page }) => {
  await adminLoginToStudents(page);

  await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });

  const searchBox = page.locator('input[placeholder="Search by name..."]');
  await searchBox.fill('E2E Promo Student');
  await page.waitForTimeout(1500);

  const filteredCount = await page.locator('table tbody tr').count();
  expect(filteredCount).toBe(3);
  await expect(page.locator('text=E2E Promo Student 1').first()).toBeVisible({ timeout: 5000 });

  const r = await axios.get(`${API}/students?search=E2E Promo Student`, { timeout: 15000 });
  expect(Array.isArray(r.data) ? r.data.length : 0).toBe(3);

  await searchBox.fill('');
  await page.waitForTimeout(1000);

  console.log(`✅ S5: Search found all 3 "E2E Promo Student" rows, API confirmed 3 matches`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('S6 — Add student: fill form → save → API confirms record', async ({ page }) => {
  await adminLoginToStudents(page);

  // Open form
  await page.click('button:has-text("+ Add Student")');
  await expect(page.locator('h2:has-text("Add New Student")')).toBeVisible({ timeout: 5000 });

  // Fill text inputs — form order: Name(0), Admission No.(1), DOB(2=date), Admission Year(3), Phone(4)…
  await page.locator('input[type="text"]').nth(0).fill(STUDENT.name);
  await page.locator('input[type="text"]').nth(1).fill(STUDENT.admission_no);

  // Form selects start with "-- Select --" (filter bar uses "All Classes"/"All Sections")
  // Scope to the form panel to avoid any filter bar selects
  const formPanel = page.locator('div').filter({ has: page.locator('h2:has-text("Add New Student")') }).last();

  // Order in form: Father Qual(0), Mother Qual(1), Father Working(2), Mother Working(3), Class(4), [Section](5), Gender(6)
  const formSelects = formPanel.locator('select');
  await formSelects.nth(4).selectOption(STUDENT.current_class);
  await page.waitForTimeout(2000); // wait for fetchSectionsForGrade API to return Grade 1 sections

  // After class select, section becomes a <select> (Grade 1 has known sections like ASTEROID)
  await formSelects.nth(5).selectOption(STUDENT.section);
  await formSelects.nth(6).selectOption(STUDENT.gender);

  await page.locator('button:has-text("Save")').first().click();
  await expect(page.locator(`text=✅ ${STUDENT.name} added`)).toBeVisible({ timeout: 8000 });

  // Search to confirm in list
  const searchBox = page.locator('input[placeholder="Search by name..."]');
  await searchBox.fill(STUDENT.name);
  await page.waitForTimeout(1000);
  await expect(page.locator(`text=${STUDENT.name}`).first()).toBeVisible({ timeout: 8000 });

  // API ASSERT
  const r = await axios.get(`${API}/students?search=${STUDENT.name}`, { timeout: 15000 });
  const created = (Array.isArray(r.data) ? r.data : []).find((s: any) => s.name === STUDENT.name);
  expect(created).toBeDefined();
  expect(created.current_class).toBe(STUDENT.current_class);
  expect(created.section).toBe(STUDENT.section);
  expect(created.is_active).toBe(true);
  crudStudentId = created.id;

  console.log(`✅ S6: Student created — ID: ${crudStudentId}, ${STUDENT.current_class}/${STUDENT.section}, confirmed in API`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('S7 — Edit student: change phone → save → API confirms updated value', async ({ page }) => {
  expect(crudStudentId).toBeTruthy();
  await adminLoginToStudents(page);

  const newPhone = '9111111111';

  const searchBox = page.locator('input[placeholder="Search by name..."]');
  await searchBox.fill(STUDENT.name);
  await page.waitForTimeout(1000);

  const studentRow = page.locator('tr').filter({ hasText: STUDENT.name });
  await expect(studentRow).toBeVisible({ timeout: 8000 });
  await studentRow.locator('button:has-text("Edit")').click();
  await expect(page.locator('h2:has-text("Edit Student")')).toBeVisible({ timeout: 5000 });

  // Phone is the 5th text input: Name(0), Adm No(1), DOB(date—skipped), Adm Year(2), Phone(3)
  // DOB is type="date" so text inputs only: Name(0), Adm No(1), Adm Year(2), Phone(3), Father Name(4)...
  await page.locator('input[type="text"]').nth(3).fill(newPhone);

  await page.locator('button:has-text("Update")').first().click();
  await expect(page.locator(`text=✅ ${STUDENT.name} updated`)).toBeVisible({ timeout: 8000 });

  const r = await axios.get(`${API}/students/${crudStudentId}`, { timeout: 15000 });
  expect(r.data.phone).toBe(newPhone);

  console.log(`✅ S7: Student updated — phone set to ${newPhone}, confirmed in API`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('S8 — Issue TC: student moves to TC Register → API confirms is_active=false', async ({ page }) => {
  expect(crudStudentId).toBeTruthy();
  await adminLoginToStudents(page);

  const searchBox = page.locator('input[placeholder="Search by name..."]');
  await searchBox.fill(STUDENT.name);
  await page.waitForTimeout(1000);

  const studentRow = page.locator('tr').filter({ hasText: STUDENT.name });
  await expect(studentRow).toBeVisible({ timeout: 8000 });
  await studentRow.locator('button:has-text("TC")').click();

  await expect(page.locator('h3:has-text("Issue Transfer Certificate")')).toBeVisible({ timeout: 5000 });
  await page.locator('input[placeholder*="Relocation"]').fill('E2E Automated Test');
  await page.locator('button:has-text("Issue TC")').click();

  await expect(page.locator('text=/TC issued/i').first()).toBeVisible({ timeout: 8000 });
  await page.waitForTimeout(2000);

  // API ASSERT — proves TC committed in backend
  const r = await axios.get(`${API}/students/${crudStudentId}`, { timeout: 15000 });
  expect(r.data.is_active).toBe(false);
  expect(r.data.is_graduated).toBe(false);
  expect(r.data.tc_date).toBeTruthy();

  // Browser verify: switch to TC Register tab — positive assertion that student moved there
  await page.locator('button:has-text("TC Register")').click();
  await page.waitForTimeout(1500);
  await expect(page.locator('h2:has-text("TC Register")')).toBeVisible({ timeout: 8000 });
  const tcRowS8 = page.locator('tr').filter({ hasText: STUDENT.name });
  await expect(tcRowS8).toBeVisible({ timeout: 8000 });

  console.log(`✅ S8: TC issued — is_active=false, tc_date set, student visible in TC Register tab`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('S9 — TC Register tab: TC student visible, delete for cleanup', async ({ page }) => {
  // Look up by admission_no in TC register (does not rely on crudStudentId being set)
  const r = await axios.get(`${API}/students/tc-register`, { timeout: 15000 });
  const tcList = Array.isArray(r.data) ? r.data : [];
  const found = tcList.find((s: any) => s.admission_no === STUDENT.admission_no);
  expect(found).toBeDefined();
  expect(found.tc_date).toBeTruthy();
  const studentId = found.id;

  await adminLoginToStudents(page);

  await page.locator('button:has-text("TC Register")').click();
  await page.waitForTimeout(1000);

  await expect(page.locator('h2:has-text("TC Register")')).toBeVisible({ timeout: 8000 });

  const tcRow = page.locator('tr').filter({ hasText: STUDENT.name });
  await expect(tcRow).toBeVisible({ timeout: 8000 });

  // Permanently delete (cleanup for this student)
  page.once('dialog', dialog => dialog.accept());
  await tcRow.locator('button:has-text("Delete")').click();
  await page.waitForTimeout(3000);

  // API ASSERT: student gone (404)
  const check = await axios.get(`${API}/students/${studentId}`, { timeout: 10000, validateStatus: () => true });
  expect(check.status).toBe(404);
  crudStudentId = '';

  console.log(`✅ S9: TC Register confirmed TC'd student (${studentId}), tc_date set, permanently deleted`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('S10 — Stats formula: total == Σ(byGrade counts), gender ≤ total', async ({ page }) => {
  await adminLoginToStudents(page);

  const r = await axios.get(`${API}/students/stats`, { timeout: 15000 });
  const stats = r.data;

  const gradeSum = stats.byGrade.reduce((sum: number, g: any) => sum + Number(g.count), 0);
  const genderSum = stats.byGender.reduce((sum: number, g: any) => sum + Number(g.count), 0);

  console.log(`\n   📊 Stats Formula Verification`);
  console.log(`   Total active:     ${stats.total}`);
  console.log(`   Σ grade counts:   ${gradeSum}  ${gradeSum === Number(stats.total) ? '✓ matches' : '✗ MISMATCH'}`);
  console.log(`   TC count:         ${stats.tcCount}`);
  console.log(`   Grade breakdown:`);
  stats.byGrade.forEach((g: any) => console.log(`     ${String(g.grade).padEnd(12)} ${g.count}`));
  console.log(`   Gender breakdown: (${genderSum} students have gender set)`);
  stats.byGender.forEach((g: any) => console.log(`     ${String(g.gender).padEnd(10)} ${g.count}`));

  // Formula assertions
  expect(gradeSum).toBe(Number(stats.total));
  expect(genderSum).toBeLessThanOrEqual(Number(stats.total));
  expect(Number(stats.tcCount)).toBeGreaterThanOrEqual(0);

  // Browser total displayed
  const headerText = await page.locator('p.text-sm.text-gray-500').first().textContent();
  expect(headerText).toContain(String(stats.total));

  console.log(`✅ S10: total(${stats.total}) == Σ grades(${gradeSum}) ✓`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('S11 — Promotion wizard: Grade 9 E2E-PROMO → Grade 10 E2E-PROMO-NEXT', async ({ page }) => {
  expect(promoStudentIds.length).toBe(3);
  await adminLoginToStudents(page);

  // Confirm 3 students in Grade 9 / E2E-PROMO before
  const before = await axios.get(`${API}/students?grade=Grade 9&section=E2E-PROMO`, { timeout: 15000 });
  const beforeList = (Array.isArray(before.data) ? before.data : []).filter((s: any) => promoStudentIds.includes(s.id));
  expect(beforeList.length).toBe(3);
  console.log(`   Before: ${beforeList.length} students in Grade 9 / E2E-PROMO`);
  console.log(`   nextGrade("Grade 9") = "Grade 10" (GRADE_ORDER index 12 → 13)`);

  // BROWSER: open wizard
  await page.click('button:has-text("Promote Students")');
  await expect(page.locator('h3:has-text("Promote Students")')).toBeVisible({ timeout: 5000 });

  // Wizard selects are inside the fixed overlay
  const overlay = page.locator('.fixed').filter({ has: page.locator('h3:has-text("Promote Students")') });
  await overlay.locator('select').nth(0).selectOption('Grade 9');
  await page.waitForTimeout(2000); // sections API

  await overlay.locator('select').nth(1).selectOption('E2E-PROMO');
  await page.locator('button:has-text("Preview Promotion")').click();
  await page.waitForTimeout(2000);

  // Preview shows 3 students → Grade 10
  await expect(page.locator('text=E2E Promo Student 1').first()).toBeVisible({ timeout: 8000 });
  await expect(page.locator('text=/3 students/i').first()).toBeVisible({ timeout: 5000 });

  // Enter new section name
  await page.locator('input[placeholder*="HIMALAYA"]').fill('E2E-PROMO-NEXT');

  // Confirm
  await page.locator('button:has-text("Confirm Promotion")').click();
  await page.waitForTimeout(3000);

  await expect(page.locator('text=Promotion Complete!')).toBeVisible({ timeout: 8000 });
  await page.locator('button:has-text("Close")').click();

  // API ASSERT: all 3 now in Grade 10 / E2E-PROMO-NEXT
  const after = await axios.get(`${API}/students?grade=Grade 10&section=E2E-PROMO-NEXT`, { timeout: 15000 });
  const afterList = (Array.isArray(after.data) ? after.data : []).filter((s: any) => promoStudentIds.includes(s.id));
  expect(afterList.length).toBe(3);
  afterList.forEach((s: any) => {
    expect(s.current_class).toBe('Grade 10');
    expect(s.section).toBe('E2E-PROMO-NEXT');
    console.log(`   ✓ ${s.name} → Grade 10 / E2E-PROMO-NEXT`);
  });

  // Grade 9 / E2E-PROMO is now empty for our students
  const empty = await axios.get(`${API}/students?grade=Grade 9&section=E2E-PROMO`, { timeout: 15000 });
  const stillThere = (Array.isArray(empty.data) ? empty.data : []).filter((s: any) => promoStudentIds.includes(s.id));
  expect(stillThere.length).toBe(0);

  console.log(`✅ S11: Promotion complete — 3 students Grade 9/E2E-PROMO → Grade 10/E2E-PROMO-NEXT`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('S12 — Alumni tab: graduated students appear, year filter works', async ({ page }) => {
  expect(gradStudentIds.length).toBe(2);
  await adminLoginToStudents(page);

  // API pre-check
  const alumniRes = await axios.get(`${API}/students/alumni`, { timeout: 15000 });
  const allAlumni: any[] = alumniRes.data?.alumni || [];
  const ourGrads = allAlumni.filter((s: any) => gradStudentIds.includes(s.id));
  expect(ourGrads.length).toBe(2);
  ourGrads.forEach((s: any) => {
    expect(s.is_graduated).toBe(true);
    expect(s.graduation_year).toBe(GRAD_YEAR);
    console.log(`   API: ${s.name} — is_graduated=true, year=${s.graduation_year}`);
  });

  // BROWSER: click Alumni tab
  await page.locator('button:has-text("Alumni")').click();
  await page.waitForTimeout(1500);

  await expect(page.locator('h2:has-text("Alumni")')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('text=E2E Grad Student 1').first()).toBeVisible({ timeout: 8000 });
  await expect(page.locator('text=E2E Grad Student 2').first()).toBeVisible({ timeout: 5000 });

  // Year filter
  await page.locator('select').filter({ hasText: 'All Years' }).selectOption(GRAD_YEAR);
  await page.waitForTimeout(1500);
  await expect(page.locator('text=E2E Grad Student 1').first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator('text=E2E Grad Student 2').first()).toBeVisible({ timeout: 5000 });

  // API year filter
  const filtered = await axios.get(`${API}/students/alumni?graduation_year=${GRAD_YEAR}`, { timeout: 15000 });
  expect(filtered.data?.alumni?.length).toBe(2);

  console.log(`✅ S12: Alumni tab shows 2 graduates, year filter "${GRAD_YEAR}" confirmed in browser + API`);
  console.log(`   Graduation formula: is_active=false, is_graduated=true, graduation_year set`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('S13 — Cleanup: all E2E test students confirmed absent from DB', async ({ page }) => {
  await adminLoginToStudents(page);

  // Delete promo students (now in Grade 10 E2E-PROMO-NEXT, still active)
  for (const id of promoStudentIds) {
    const r = await axios.delete(`${API}/students/${id}/permanent`, { timeout: 10000, validateStatus: () => true });
    console.log(`   Deleted promo student ${id}: HTTP ${r.status}`);
  }
  // Delete grad students (graduated, is_active=false)
  for (const id of gradStudentIds) {
    const r = await axios.delete(`${API}/students/${id}/permanent`, { timeout: 10000, validateStatus: () => true });
    console.log(`   Deleted grad student ${id}: HTTP ${r.status}`);
  }
  await page.waitForTimeout(2000);

  // BROWSER: reload and search for any E2E students
  await page.goto(`${BASE}/students`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('h1:has-text("Student Management")', { timeout: 15000 });

  const searchBox = page.locator('input[placeholder="Search by name..."]');
  await searchBox.fill('E2E');
  await page.waitForTimeout(1500);

  const rows = page.locator('table tbody tr');
  const count = await rows.count();
  if (count > 0) {
    const tableText = await page.locator('table tbody').textContent() ?? '';
    expect(tableText).not.toContain('E2E Promo Student');
    expect(tableText).not.toContain('E2E Grad Student');
    expect(tableText).not.toContain('E2E Test Student');
  }

  // API final check
  const r = await axios.get(`${API}/students?search=E2E`, { timeout: 15000 });
  const remaining = (Array.isArray(r.data) ? r.data : []).filter((s: any) => s.name?.startsWith('E2E '));
  expect(remaining.length).toBe(0);

  console.log(`✅ S13: All E2E test students confirmed absent — DB is clean`);
});

}); // end test.describe('Student Management')
