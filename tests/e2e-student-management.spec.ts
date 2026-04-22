import { test, expect } from '@playwright/test';
import axios from 'axios';

const BASE = 'https://cbas-frontend-production.up.railway.app';
const API  = 'https://cbas-backend-production.up.railway.app';
const ADMIN_EMAIL    = 'garkaswetha@gmail.com';
const ADMIN_PASSWORD = 'swetha123';

const TEST_STUDENT = {
  name:         'E2E Student Test',
  admission_no: 'E2E-999',
  current_class: 'Grade 9',
  section:      'HIMALAYA',
  gender:       'Male',
  father_name:  'E2E Father',
  mother_name:  'E2E Mother',
  phone:        '9123456789',
};

async function login(page: any) {
  await page.goto(BASE);
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  await page.waitForTimeout(2000);
}

async function goToStudents(page: any) {
  await page.click('a:has-text("Student Management"), span:has-text("Student Management")');
  await page.waitForSelector('table', { timeout: 10000 });
}

// Get test student from API — searches active students only
async function getTestStudent() {
  const res = await axios.get(`${API}/students`, { params: { search: TEST_STUDENT.name } });
  return res.data.find((s: any) => s.name === TEST_STUDENT.name) || null;
}

// Cleanup: use include_inactive=true to find the student even after TC (is_active=false)
async function cleanupTestStudent() {
  try {
    const res = await axios.get(`${API}/students`, {
      params: { search: TEST_STUDENT.name, include_inactive: 'true' }
    });
    const s = res.data.find((x: any) => x.name === TEST_STUDENT.name || x.admission_no === TEST_STUDENT.admission_no);
    if (s) await axios.delete(`${API}/students/${s.id}/permanent`);
  } catch {}
}

test.describe('E2E — Student Management', () => {

  test.beforeAll(async () => { await cleanupTestStudent(); });
  test.afterAll(async ()  => { await cleanupTestStudent(); });

  // ── TEST 1: Add student → verify all fields in DB ───────────────
  test('1. Add student via UI → verify all fields saved correctly in backend', async ({ page }) => {
    await login(page);
    await goToStudents(page);

    await page.click('button:has-text("+ Add Student")');
    await page.waitForSelector('text=Add New Student');

    // Fill all fields
    await page.locator('label:has-text("Full Name") + input').fill(TEST_STUDENT.name);
    await page.locator('label:has-text("Admission No.") + input').fill(TEST_STUDENT.admission_no);
    await page.locator('label:has-text("Father Name") + input').fill(TEST_STUDENT.father_name);
    await page.locator('label:has-text("Mother Name") + input').fill(TEST_STUDENT.mother_name);
    await page.locator('label:has-text("Phone") + input').first().fill(TEST_STUDENT.phone);
    await page.locator('label:has-text("Class") + select').selectOption(TEST_STUDENT.current_class);
    await page.locator('label:has-text("Section") + input').fill(TEST_STUDENT.section);
    await page.locator('label:has-text("Gender") + select').selectOption(TEST_STUDENT.gender);

    await page.click('button:has-text("Save")');
    await page.waitForTimeout(2000);
    await expect(page.getByText(`✅ ${TEST_STUDENT.name} added`)).toBeVisible({ timeout: 5000 });

    // ── BACKEND VERIFY ──
    const saved = await getTestStudent();
    expect(saved).toBeTruthy();
    expect(saved.name).toBe(TEST_STUDENT.name);
    expect(saved.admission_no).toBe(TEST_STUDENT.admission_no);
    expect(saved.current_class).toBe(TEST_STUDENT.current_class);
    expect(saved.section?.toUpperCase()).toBe(TEST_STUDENT.section);
    expect(saved.gender).toBe(TEST_STUDENT.gender);
    expect(saved.father_name).toBe(TEST_STUDENT.father_name);
    expect(saved.mother_name).toBe(TEST_STUDENT.mother_name);
    expect(saved.is_active).toBe(true);
    console.log(`✅ Student saved — all fields verified in backend. ID: ${saved.id}`);
  });

  // ── TEST 2: Grade filter → backend returns only that grade ───────
  test('2. Grade filter → backend correctly filters students by grade', async ({ page }) => {
    await login(page);
    await goToStudents(page);

    await page.locator('select').filter({ hasText: 'All Classes' }).selectOption('Grade 5');
    await page.waitForTimeout(1500);
    const uiCount = await page.locator('text=/Showing (\\d+) students/').textContent();

    // ── BACKEND VERIFY ──
    const res = await axios.get(`${API}/students`, { params: { grade: 'Grade 5' } });
    const apiCount = res.data.length;
    expect(uiCount).toContain(String(apiCount));
    console.log(`✅ Grade 5 filter — UI shows "${uiCount}", API returns ${apiCount} — match`);
  });

  // ── TEST 3: Search → backend returns correct matches ─────────────
  test('3. Search by name → backend search returns same results', async ({ page }) => {
    await login(page);
    await goToStudents(page);

    await page.waitForFunction(() => document.querySelectorAll('tbody tr').length > 5);
    await page.fill('input[placeholder="Search by name..."]', 'E2E Student');
    await page.waitForTimeout(1500);
    const rows = await page.locator('tbody tr').count();

    // ── BACKEND VERIFY ──
    const res = await axios.get(`${API}/students`, { params: { search: 'E2E Student' } });
    expect(rows).toBe(res.data.length);
    console.log(`✅ Search "E2E Student" → UI: ${rows} rows, API: ${res.data.length} — match`);
  });

  // ── TEST 4: Edit student → verify change in backend ─────────────
  test('4. Edit student → verify updated fields in backend', async ({ page }) => {
    await login(page);
    await goToStudents(page);

    await page.fill('input[placeholder="Search by name..."]', TEST_STUDENT.name);
    await page.waitForTimeout(1500);
    await page.locator('button:has-text("Edit")').first().click();
    await expect(page.getByText('✏️ Edit Student')).toBeVisible();

    await page.locator('label:has-text("Father Name") + input').fill('Updated E2E Father');
    await page.locator('label:has-text("Phone") + input').first().fill('9000000000');
    await page.click('button:has-text("Update")');
    await page.waitForTimeout(2000);
    await expect(page.getByText(`✅ ${TEST_STUDENT.name} updated`)).toBeVisible({ timeout: 5000 });

    // ── BACKEND VERIFY ──
    const saved = await getTestStudent();
    expect(saved.father_name).toBe('Updated E2E Father');
    expect(saved.phone).toBe('9000000000');
    console.log('✅ Edit saved — father_name and phone verified in backend');
  });

  // ── TEST 5: Stats API matches UI count ───────────────────────────
  test('5. Grade stat cards match backend stats API', async ({ page }) => {
    await login(page);
    await goToStudents(page);

    // ── BACKEND VERIFY ──
    const res = await axios.get(`${API}/students/stats`);
    const grade9 = res.data.byGrade.find((g: any) => g.grade === 'Grade 9');
    expect(grade9).toBeTruthy();
    expect(+grade9.count).toBeGreaterThan(0);

    // UI card for Grade 9 should show same count
    const card = page.locator('.cursor-pointer').filter({ hasText: 'Grade 9' });
    const cardText = await card.textContent();
    expect(cardText).toContain(String(grade9.count));
    console.log(`✅ Grade 9 stat card shows ${grade9.count} — matches backend stats API`);
  });

  // ── TEST 6: TC button → student marked is_active=false in DB ────
  test('6. TC button → student is soft-deleted (is_active=false) in backend', async ({ page }) => {
    await login(page);
    await goToStudents(page);

    await page.fill('input[placeholder="Search by name..."]', TEST_STUDENT.name);
    await page.waitForTimeout(1500);

    // Get student ID from backend before TC
    const studentBefore = await getTestStudent();
    expect(studentBefore).toBeTruthy();
    expect(studentBefore.is_active).toBe(true);

    page.once('dialog', d => { console.log('Dialog:', d.message()); d.accept(); });
    await page.locator('button:has-text("TC")').first().click();
    await page.waitForTimeout(3000);

    // ── BACKEND VERIFY: student is_active = false ──
    const allRes = await axios.get(`${API}/students`, { params: { search: TEST_STUDENT.name } });
    expect(allRes.data.length).toBe(0); // active list should be empty
    console.log('✅ TC issued — student no longer in active list (is_active=false in DB)');

    // ── BUG REPORT: tc_date not set, no UI to view TC'd students ──
    console.log('⚠️  IMPROVEMENT NEEDED: tc_date is never set when TC is issued');
    console.log('⚠️  IMPROVEMENT NEEDED: No UI exists to view/reactivate TC\'d students');
  });

});
