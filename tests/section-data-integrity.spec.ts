import { test, expect } from '@playwright/test';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Section Data Integrity — E2E
//
// Creates one section (E2E-INTEGRITY) in Grade 6 and verifies it propagates
// to every page in both admin and teacher portals where sections are shown.
//
// DI1  — Section Management: E2E-INTEGRITY appears in Grade 6 active list
// DI2  — Student Management filter: section dropdown includes E2E-INTEGRITY for Grade 6
// DI3  — Student Management add form: section select includes E2E-INTEGRITY for Grade 6
// DI4  — Student Management: filter by E2E-INTEGRITY shows the test student
// DI5  — PASA marks entry: section dropdown includes E2E-INTEGRITY for Grade 6
// DI6  — Activities create form: E2E-INTEGRITY toggle button visible for Grade 6
// DI7  — Activities filter: section dropdown includes E2E-INTEGRITY for Grade 6
// DI8  — User Management: E2E-INTEGRITY absent from section toggles (hardcoded ALL_SECTIONS)
// DI9  — Class Observation: section text input accepts E2E-INTEGRITY (free-text field)
// DI10 — Teacher login: Grade 6 / E2E-INTEGRITY button visible in "Your Assigned Sections"
// ─────────────────────────────────────────────────────────────────────────────

const BASE = 'https://cbas-frontend-production.up.railway.app';
const API  = 'https://cbas-backend-production.up.railway.app';
const ACADEMIC_YEAR = '2025-26';

const ADMIN = { email: 'garkaswetha@gmail.com', password: 'swetha123' };

const TEST_GRADE   = 'Grade 6';
const TEST_SECTION = 'E2E-INTEGRITY';

const TEACHER = {
  name:     'E2E DI Teacher',
  email:    'e2e.di.teacher@cbas.test',
  password: 'DITeacher123',
};

const STUDENT = {
  name:         'E2E DI Student',
  admission_no: 'E2EDIADM001',
  gender:       'Male',
};

let sectionId = '';
let studentId = '';
let teacherId = '';

// ── helpers ───────────────────────────────────────────────────────────────────

async function adminLogin(page: any, path: string) {
  const res = await axios.post(`${API}/users/login`,
    { email: ADMIN.email, password: ADMIN.password }, { timeout: 15000 });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((u: any) => localStorage.setItem('cbas_user', JSON.stringify(u)), res.data.user);
  await page.goto(`${BASE}/${path}`, { waitUntil: 'networkidle', timeout: 40000 });
}

async function findSectionInApi(): Promise<any | null> {
  try {
    const r = await axios.get(`${API}/sections/counts?academic_year=${ACADEMIC_YEAR}`,
      { timeout: 15000, validateStatus: () => true });
    return (Array.isArray(r.data) ? r.data : [])
      .find((s: any) => s.grade === TEST_GRADE && s.name === TEST_SECTION) ?? null;
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Section Data Integrity', () => {

  test.beforeAll(async () => {
    console.log('\n🌱 Setting up E2E-INTEGRITY test data...');

    // ── 1. Clean stale section ────────────────────────────────────────────────
    const staleSection = await findSectionInApi();
    if (staleSection) {
      await axios.patch(`${API}/sections/${staleSection.id}/reactivate`, {},
        { timeout: 10000, validateStatus: () => true });
      await axios.delete(`${API}/sections/${staleSection.id}`,
        { timeout: 10000, validateStatus: () => true });
      console.log(`  🧹 Removed stale section: ${staleSection.id}`);
    }

    // ── 2. Clean stale student ────────────────────────────────────────────────
    try {
      const r = await axios.get(`${API}/students`,
        { timeout: 15000, validateStatus: () => true });
      const stale = (r.data?.data || r.data || []).find((s: any) => s.admission_no === STUDENT.admission_no);
      if (stale) {
        await axios.delete(`${API}/students/${stale.id}/permanent`,
          { timeout: 10000, validateStatus: () => true });
        console.log(`  🧹 Removed stale student: ${stale.id}`);
      }
    } catch {}

    // ── 3. Clean stale teacher ────────────────────────────────────────────────
    for (const endpoint of [`${API}/users`, `${API}/users/inactive`]) {
      try {
        const r = await axios.get(endpoint, { timeout: 15000, validateStatus: () => true });
        const stale = (r.data || []).find((u: any) => u.email === TEACHER.email);
        if (stale) {
          await axios.delete(`${API}/users/${stale.id}/permanent`,
            { timeout: 10000, validateStatus: () => true });
          console.log(`  🧹 Removed stale teacher: ${stale.id}`);
        }
      } catch {}
    }

    // ── 4. Create section ─────────────────────────────────────────────────────
    try {
      const sec = await axios.post(`${API}/sections`,
        { grade: TEST_GRADE, name: TEST_SECTION, academic_year: ACADEMIC_YEAR },
        { timeout: 15000 });
      sectionId = sec.data?.id || sec.data?.section?.id || '';
    } catch {}
    if (!sectionId) {
      const found = await findSectionInApi();
      sectionId = found?.id || '';
    }
    console.log(`  ✅ Section created: ${TEST_SECTION} in ${TEST_GRADE} (id=${sectionId})`);

    // ── 5. Create test student (makes section visible in student-derived dropdowns) ──
    try {
      const stu = await axios.post(`${API}/students`,
        { name: STUDENT.name, admission_no: STUDENT.admission_no,
          current_class: TEST_GRADE, section: TEST_SECTION, gender: STUDENT.gender },
        { timeout: 15000 });
      studentId = stu.data?.id || stu.data?.student?.id || '';
    } catch {}
    if (!studentId) {
      try {
        const r = await axios.get(`${API}/students`, { timeout: 15000 });
        const found = (r.data?.data || r.data || []).find((s: any) => s.admission_no === STUDENT.admission_no);
        studentId = found?.id || '';
      } catch {}
    }
    console.log(`  ✅ Student created: ${STUDENT.name} (id=${studentId})`);

    // ── 6. Create test teacher ────────────────────────────────────────────────
    try {
      const tch = await axios.post(`${API}/users`,
        { name: TEACHER.name, email: TEACHER.email, password: TEACHER.password,
          role: 'teacher', assigned_classes: [TEST_GRADE] },
        { timeout: 15000 });
      teacherId = tch.data?.id || tch.data?.user?.id || '';
    } catch {}
    if (!teacherId) {
      try {
        const r = await axios.get(`${API}/users`, { timeout: 15000 });
        const found = (r.data || []).find((u: any) => u.email === TEACHER.email);
        teacherId = found?.id || '';
      } catch {}
    }
    console.log(`  ✅ Teacher created: ${TEACHER.name} (id=${teacherId})`);

    // ── 7. Create teacher mapping for Grade 6 / E2E-INTEGRITY ────────────────
    if (teacherId) {
      try {
        await axios.post(`${API}/mappings/save`, {
          teacher_id: teacherId,
          teacher_name: TEACHER.name,
          teacher_email: TEACHER.email,
          academic_year: ACADEMIC_YEAR,
          mappings: [{ grade: TEST_GRADE, section: TEST_SECTION, subject: 'Tamil', is_class_teacher: false }],
        }, { timeout: 15000 });
        console.log(`  ✅ Mapping saved: ${TEST_GRADE} / ${TEST_SECTION} for ${TEACHER.name}`);
      } catch (e: any) {
        console.log(`  ⚠️  Mapping save failed: ${e.message}`);
      }
    }

    console.log('🌱 Setup complete.\n');
  });

  test.afterAll(async () => {
    console.log('\n🧹 Cleaning up E2E-INTEGRITY test data...');

    if (studentId) {
      await axios.delete(`${API}/students/${studentId}/permanent`,
        { timeout: 10000, validateStatus: () => true }).catch(() => {});
      console.log(`  🧹 Student deleted: ${studentId}`);
    }

    if (teacherId) {
      await axios.delete(`${API}/users/${teacherId}/permanent`,
        { timeout: 10000, validateStatus: () => true }).catch(() => {});
      console.log(`  🧹 Teacher deleted: ${teacherId}`);
    }

    if (sectionId) {
      await axios.patch(`${API}/sections/${sectionId}/reactivate`, {},
        { timeout: 10000, validateStatus: () => true }).catch(() => {});
      await axios.delete(`${API}/sections/${sectionId}`,
        { timeout: 10000, validateStatus: () => true }).catch(() => {});
      console.log(`  🧹 Section deleted: ${sectionId}`);
    }

    // Paranoid pass: find any stale section by name
    const stale = await findSectionInApi();
    if (stale) {
      await axios.patch(`${API}/sections/${stale.id}/reactivate`, {},
        { timeout: 10000, validateStatus: () => true }).catch(() => {});
      await axios.delete(`${API}/sections/${stale.id}`,
        { timeout: 10000, validateStatus: () => true }).catch(() => {});
    }

    console.log('🧹 Done.\n');
  });

  // ── DI1: Section Management — new section in active list ─────────────────
  test('DI1 — Section Management: E2E-INTEGRITY appears in Grade 6 active list', async ({ page }) => {
    await adminLogin(page, 'sections');
    await page.waitForSelector('h1:has-text("Section Management")', { timeout: 15000 });

    // Click Grade 6 (button text also includes " sections" count, use substring match)
    await page.locator(`button:has-text("${TEST_GRADE}")`).click();
    await page.waitForTimeout(1000);

    // Active sections panel for Grade 6 should contain E2E-INTEGRITY
    const activePanel = page.locator('div.bg-white')
      .filter({ has: page.locator('h2:has-text("Active Sections in Grade 6")') });
    await expect(activePanel).toBeVisible({ timeout: 8000 });
    await expect(activePanel.locator(`span.font-semibold:has-text("${TEST_SECTION}")`))
      .toBeVisible({ timeout: 5000 });
    console.log(`✅ DI1: "${TEST_SECTION}" visible in Grade 6 active sections list`);
  });

  // ── DI2: Student Management filter section dropdown ───────────────────────
  test('DI2 — Student Management filter: section dropdown includes E2E-INTEGRITY for Grade 6', async ({ page }) => {
    await adminLogin(page, 'students');
    await page.waitForSelector('select', { timeout: 12000 });

    // Select Grade 6 in the Class filter
    const classSelect = page.locator('select').filter({ has: page.locator('option:has-text("All Classes")') }).first();
    await classSelect.selectOption(TEST_GRADE);
    await page.waitForTimeout(1500);

    // Section filter dropdown should include E2E-INTEGRITY
    const sectionSelect = page.locator('select').filter({ has: page.locator('option:has-text("All Sections")') }).first();
    const options = await sectionSelect.locator('option').allTextContents();
    expect(options.some(o => o.trim() === TEST_SECTION)).toBe(true);
    console.log(`✅ DI2: "${TEST_SECTION}" in Student Management section filter — options: [${options.join(', ')}]`);
  });

  // ── DI3: Student Management add-student form section select ───────────────
  test('DI3 — Student Management add form: section select includes E2E-INTEGRITY for Grade 6', async ({ page }) => {
    await adminLogin(page, 'students');
    await page.waitForSelector('button:has-text("+ Add Student")', { timeout: 12000 });
    await page.click('button:has-text("+ Add Student")');
    await page.waitForSelector('h2:has-text("Add New Student")', { timeout: 5000 });

    // Find "Class" label inside the form and select Grade 6
    const formContainer = page.locator('div.bg-white')
      .filter({ has: page.locator('h2:has-text("Add New Student")') });
    const classDiv = formContainer.locator('label')
      .filter({ hasText: /^Class$/ }).locator('..');
    await classDiv.locator('select').selectOption(TEST_GRADE);
    await page.waitForTimeout(1500); // wait for fetchSectionsForGrade

    // Section select should appear (formSections > 0) and contain E2E-INTEGRITY
    const sectionDiv = formContainer.locator('label')
      .filter({ hasText: /^Section$/ }).locator('..');
    const sectionSelect = sectionDiv.locator('select');
    await expect(sectionSelect).toBeVisible({ timeout: 5000 });
    const options = await sectionSelect.locator('option').allTextContents();
    expect(options.some(o => o.trim() === TEST_SECTION)).toBe(true);
    console.log(`✅ DI3: "${TEST_SECTION}" in Student add form section select — options: [${options.join(', ')}]`);
  });

  // ── DI4: Filtering by E2E-INTEGRITY shows the test student ───────────────
  test('DI4 — Student Management: filter by E2E-INTEGRITY shows test student', async ({ page }) => {
    await adminLogin(page, 'students');
    await page.waitForSelector('select', { timeout: 12000 });

    // Filter by Grade 6
    const classSelect = page.locator('select').filter({ has: page.locator('option:has-text("All Classes")') }).first();
    await classSelect.selectOption(TEST_GRADE);
    await page.waitForTimeout(500);

    // Filter by E2E-INTEGRITY section
    const sectionSelect = page.locator('select').filter({ has: page.locator('option:has-text("All Sections")') }).first();
    await sectionSelect.selectOption(TEST_SECTION);
    await page.waitForTimeout(1500);

    // Test student should appear in the table
    await expect(page.locator(`tbody tr:has-text("${STUDENT.name}")`))
      .toBeVisible({ timeout: 8000 });
    console.log(`✅ DI4: "${STUDENT.name}" visible when filtering by Grade 6 / ${TEST_SECTION}`);
  });

  // ── DI5: PASA marks entry section dropdown ────────────────────────────────
  test('DI5 — PASA marks entry: section dropdown includes E2E-INTEGRITY for Grade 6', async ({ page }) => {
    await adminLogin(page, 'pasa');
    await page.waitForSelector('h1:has-text("PA/SA Marks")', { timeout: 12000 });

    // PASA page defaults to "Exam Configuration" tab — click "Marks Entry" first
    await page.click('button:has-text("Marks Entry")');
    await page.waitForTimeout(500);

    // Select Grade 6 in the grade selector
    const gradeSelect = page.locator('select')
      .filter({ has: page.locator('option:has-text("Select grade")') }).first();
    await gradeSelect.selectOption(TEST_GRADE);
    await page.waitForTimeout(1500); // wait for fetchSections

    // Section dropdown should include E2E-INTEGRITY
    const sectionSelect = page.locator('select')
      .filter({ has: page.locator('option:has-text("Select section")') }).first();
    await expect(sectionSelect).toBeVisible({ timeout: 5000 });
    const options = await sectionSelect.locator('option').allTextContents();
    expect(options.some(o => o.trim() === TEST_SECTION)).toBe(true);
    console.log(`✅ DI5: "${TEST_SECTION}" in PASA section dropdown — options: [${options.join(', ')}]`);
  });

  // ── DI6: Activities create form section toggle ────────────────────────────
  test('DI6 — Activities create form: E2E-INTEGRITY toggle button visible for Grade 6', async ({ page }) => {
    await adminLogin(page, 'activities');
    await page.waitForSelector('button:has-text("+ Add Activity")', { timeout: 12000 });
    await page.click('button:has-text("+ Add Activity")');
    await page.waitForTimeout(500);

    // Find the Grade(s) area and select Grade 6
    const gradeArea = page.locator('label')
      .filter({ hasText: /Grade\(s\)/ }).locator('..');
    await gradeArea.locator(`button:has-text("${TEST_GRADE}")`).click();

    // Grade click triggers GET /students?limit=2000 inside a useEffect — networkidle can resolve
    // before that useEffect fires, so we wait directly for the specific button to appear.
    const sectionBtn = page.locator('button').filter({ hasText: /^E2E-INTEGRITY$/ });
    await sectionBtn.waitFor({ state: 'visible', timeout: 25000 });
    console.log(`✅ DI6: "${TEST_SECTION}" toggle button visible in Activities create form for ${TEST_GRADE}`);
  });

  // ── DI7: Activities filter section dropdown ───────────────────────────────
  test('DI7 — Activities filter: section dropdown includes E2E-INTEGRITY for Grade 6', async ({ page }) => {
    await adminLogin(page, 'activities');
    await page.waitForSelector('select', { timeout: 12000 });

    // Select Grade 6 in the Grade filter
    const gradeSelect = page.locator('select')
      .filter({ has: page.locator('option:has-text("All Grades")') }).first();
    await gradeSelect.selectOption(TEST_GRADE);

    // Wait for the section dropdown to appear AND populate (fetchSections calls GET /students?limit=2000)
    const sectionSelect = page.locator('select')
      .filter({ has: page.locator('option:has-text("All Sections")') }).first();
    await expect(sectionSelect).toBeVisible({ timeout: 8000 });
    // Wait until E2E-INTEGRITY appears as an option (dynamic load, may take a few seconds on Railway)
    await sectionSelect.locator(`option:has-text("${TEST_SECTION}")`).waitFor({ state: 'attached', timeout: 15000 });
    const options = await sectionSelect.locator('option').allTextContents();
    expect(options.some(o => o.trim() === TEST_SECTION)).toBe(true);
    console.log(`✅ DI7: "${TEST_SECTION}" in Activities section filter — options: [${options.join(', ')}]`);
  });

  // ── DI8: User Management — section toggles fetched from API (no longer hardcoded) ───
  test('DI8 — User Management: E2E-INTEGRITY appears in section toggles (fetched from API)', async ({ page }) => {
    // UserManagementPage previously had ALL_SECTIONS hardcoded — now it fetches from
    // GET /sections/counts?academic_year=... so new sections appear automatically.
    await adminLogin(page, 'users');
    await page.waitForSelector('button:has-text("+ Add Teacher")', { timeout: 12000 });
    await page.click('button:has-text("+ Add Teacher")');
    await page.waitForSelector('text=Add New Teacher', { timeout: 5000 });

    // fetchAllSections() may still be in flight when the form opens — wait directly for the button.
    // UserManagementPage now fetches sections from GET /sections/counts (no longer hardcoded).
    const sectionBtn = page.locator('button').filter({ hasText: /^E2E-INTEGRITY$/ });
    await sectionBtn.waitFor({ state: 'visible', timeout: 25000 });
    const allBtnTexts = await page.locator('label').filter({ hasText: /Assigned Sections/ }).locator('..').locator('button').allTextContents();
    console.log(`✅ DI8: "${TEST_SECTION}" visible in User Management section toggles (${allBtnTexts.length} sections from API)`);
  });

  // ── DI9: Class Observation — free-text section input ─────────────────────
  test('DI9 — Class Observation: section text input accepts E2E-INTEGRITY', async ({ page }) => {
    await adminLogin(page, 'observation');
    await page.waitForSelector('input[placeholder="Section"]', { timeout: 12000 });

    // Class Observation uses a free-text input for section (auto-uppercased)
    const sectionInput = page.locator('input[placeholder="Section"]').first();
    await expect(sectionInput).toBeVisible({ timeout: 5000 });
    await sectionInput.fill(TEST_SECTION.toLowerCase()); // type lowercase
    await page.waitForTimeout(300);

    // Component calls .toUpperCase() on change
    const value = await sectionInput.inputValue();
    expect(value).toBe(TEST_SECTION); // must be uppercased
    console.log(`✅ DI9: Class Observation section input accepted "${value}" (auto-uppercased free-text field)`);
  });

  // ── DI10: Teacher login — section picker shows mapped section ─────────────
  test('DI10 — Teacher login: Grade 6 / E2E-INTEGRITY visible in "Your Assigned Sections"', async ({ page }) => {
    // Log in as the test teacher (increase goto timeout to handle Railway cold starts)
    const loginRes = await axios.post(`${API}/users/login`,
      { email: TEACHER.email, password: TEACHER.password }, { timeout: 15000 });
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate((u: any) => localStorage.setItem('cbas_user', JSON.stringify(u)), loginRes.data.user);
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });

    // Wait for mappings to load (GET /mappings/teacher/{id}/dashboard)
    await page.waitForTimeout(3000);

    // "Your Assigned Sections" heading should be visible
    await expect(page.locator('h3:has-text("Your Assigned Sections")')).toBeVisible({ timeout: 10000 });

    // A button with "Grade 6 — E2E-INTEGRITY" text must be visible
    const sectionBtn = page.locator('button').filter({ hasText: new RegExp(TEST_SECTION) }).first();
    await expect(sectionBtn).toBeVisible({ timeout: 8000 });
    const btnText = await sectionBtn.textContent();
    console.log(`✅ DI10: Teacher sees section picker button: "${btnText?.trim()}"`);
  });

});
