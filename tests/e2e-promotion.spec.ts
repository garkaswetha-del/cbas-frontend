import { test, expect } from '@playwright/test';
import axios from 'axios';

const BASE = 'https://cbas-frontend-production.up.railway.app';
const API  = 'https://cbas-backend-production.up.railway.app';
const ADMIN_EMAIL    = 'garkaswetha@gmail.com';
const ADMIN_PASSWORD = 'swetha123';

// Test students used in promotion tests
const PROMO_STUDENT = {
  name: 'E2E Promo Student',
  admission_no: 'E2E-PROMO-001',
  current_class: 'Grade 3',
  section: 'E2ETEST',
  gender: 'Male',
};

const GRAD_STUDENT = {
  name: 'E2E Grad Student',
  admission_no: 'E2E-GRAD-001',
  current_class: 'Grade 10',
  section: 'E2ETEST',
  gender: 'Female',
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
  await page.click('a:has-text("Student"), span:has-text("Student")');
  await page.waitForSelector('h1:has-text("Student Management")', { timeout: 12000 });
  await page.waitForTimeout(1500);
}

async function cleanupByName(name: string) {
  const deleteById = async (id: string) => {
    try { await axios.delete(`${API}/students/${id}/permanent`); } catch {}
  };
  // Active students
  try {
    const res = await axios.get(`${API}/students`, { params: { search: name } });
    for (const s of res.data) {
      if (s.name === name) await deleteById(s.id);
    }
  } catch {}
  // TC register
  try {
    const tc = await axios.get(`${API}/students/tc-register`);
    for (const s of tc.data) {
      if (s.name === name) await deleteById(s.id);
    }
  } catch {}
  // Alumni
  try {
    const al = await axios.get(`${API}/students/alumni`);
    for (const s of (al.data?.alumni || [])) {
      if (s.name === name) await deleteById(s.id);
    }
  } catch {}
}

async function createStudent(data: any): Promise<string> {
  const res = await axios.post(`${API}/students`, data);
  return res.data.id;
}

test.describe('Promotion & Graduation', () => {

  // ─── PR1: Wizard shows Grade 10 with Alumni label ───────────────────────
  test('PR1 — Grade 10 (→ Alumni) option exists in promotion wizard', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    await page.click('button:has-text("Promote Students")');
    await page.waitForSelector('label:has-text("Current Grade")', { timeout: 6000 });

    const gradeSelect = page.locator('select').filter({ hasText: '-- Select Grade --' });
    const options = await gradeSelect.locator('option').allTextContents();
    const grade10Option = options.find(o => o.includes('Grade 10'));
    expect(grade10Option).toBeTruthy();
    expect(grade10Option).toContain('Alumni');
    console.log(`✅ PR1: Grade 10 option shows "${grade10Option}"`);

    await page.locator('button:has-text("✕")').last().click();
  });

  // ─── PR2: New section picker is a dropdown (not free text) ──────────────
  test('PR2 — New Section in preview step is a dropdown, not free text', async ({ page }) => {
    await cleanupByName(PROMO_STUDENT.name);
    await createStudent(PROMO_STUDENT);

    await login(page);
    await goToStudents(page);
    await page.click('button:has-text("Promote Students")');
    await page.waitForSelector('label:has-text("Current Grade")', { timeout: 6000 });

    // Select grade
    const gradeSelect = page.locator('select').filter({ hasText: '-- Select Grade --' });
    await gradeSelect.selectOption('Grade 3');
    await page.waitForTimeout(1500);

    // Select section
    const sectionSelect = page.locator('select').filter({ hasText: '-- Select Section --' }).first();
    await sectionSelect.selectOption('E2ETEST');
    await page.waitForTimeout(500);

    // Preview
    await page.click('button:has-text("Preview Promotion")');
    await page.waitForTimeout(2000);

    // Verify new section is a <select> not <input type="text">
    const newSectionSelect = page.locator('select').filter({ hasText: '-- Select Section --' });
    await expect(newSectionSelect).toBeVisible({ timeout: 5000 });

    // Verify the old free-text placeholder is NOT there
    const freeText = page.locator('input[placeholder="e.g. HIMALAYA"]');
    const freeTextVisible = await freeText.isVisible().catch(() => false);
    expect(freeTextVisible).toBe(false);

    console.log('✅ PR2: New section field is a dropdown, not free text');
    await page.locator('button:has-text("✕")').last().click();
    await cleanupByName(PROMO_STUDENT.name);
  });

  // ─── PR3: Full promotion end-to-end (Grade 3 → Grade 4, verify DB) ──────
  test('PR3 — Full promotion: Grade 3 E2ETEST → Grade 4, DB updated', async ({ page }) => {
    await cleanupByName(PROMO_STUDENT.name);
    const id = await createStudent(PROMO_STUDENT);

    await login(page);
    await goToStudents(page);
    await page.click('button:has-text("Promote Students")');
    await page.waitForSelector('label:has-text("Current Grade")', { timeout: 6000 });

    // Select grade and section
    await page.locator('select').filter({ hasText: '-- Select Grade --' }).selectOption('Grade 3');
    await page.waitForTimeout(1500);
    await page.locator('select').filter({ hasText: '-- Select Section --' }).first().selectOption('E2ETEST');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Preview Promotion")');
    await page.waitForTimeout(2500);

    // Verify student appears in preview
    await expect(page.locator(`text=${PROMO_STUDENT.name}`).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Grade 4').first()).toBeVisible();
    console.log('✅ PR3: Preview shows student with Grade 4 as next grade');

    // Select "Other (type below)" and enter a section name
    const newSectionSelect = page.locator('select').filter({ hasText: '-- Select Section --' }).last();
    await newSectionSelect.selectOption('__other__');
    await page.waitForTimeout(500);

    // Type in the custom section input
    const customInput = page.locator('input[placeholder="e.g. HIMALAYA"]');
    await expect(customInput).toBeVisible({ timeout: 3000 });
    await customInput.fill('E2ENEXT');

    // Confirm promotion
    await page.click('button:has-text("Confirm Promotion")');
    await page.waitForTimeout(3000);

    // Should reach "done" step
    await expect(page.locator('text=Promotion Complete')).toBeVisible({ timeout: 8000 });
    console.log('✅ PR3: Promotion complete UI shown');

    // Verify in DB — find by id directly
    const res = await axios.get(`${API}/students/${id}`);
    expect(res.data.current_class).toBe('Grade 4');
    expect(res.data.section).toBe('E2ENEXT');
    console.log(`✅ PR3: DB confirms student id=${id} moved to Grade 4 / E2ENEXT`);

    await cleanupByName(PROMO_STUDENT.name);
  });

  // ─── PR4: Grade 10 → Alumni graduation end-to-end ───────────────────────
  test('PR4 — Grade 10 graduation: student moves to Alumni in DB', async ({ page }) => {
    await cleanupByName(GRAD_STUDENT.name);
    const id = await createStudent(GRAD_STUDENT);

    await login(page);
    await goToStudents(page);
    await page.click('button:has-text("Promote Students")');
    await page.waitForSelector('label:has-text("Current Grade")', { timeout: 6000 });

    // Select Grade 10
    await page.locator('select').filter({ hasText: '-- Select Grade --' }).selectOption('Grade 10');
    await page.waitForTimeout(1500);

    // Select section E2ETEST
    const sectionSelect = page.locator('select').filter({ hasText: '-- Select Section --' }).first();
    await expect(sectionSelect).not.toBeDisabled({ timeout: 3000 });
    await sectionSelect.selectOption('E2ETEST');
    await page.waitForTimeout(500);

    await page.click('button:has-text("Preview Promotion")');
    await page.waitForTimeout(2500);

    // Verify: "Graduate to Alumni" button shown (not "Confirm Promotion")
    await expect(page.locator('button:has-text("Graduate to Alumni")')).toBeVisible({ timeout: 5000 });
    const confirmBtn = await page.locator('button:has-text("Confirm Promotion")').isVisible().catch(() => false);
    expect(confirmBtn).toBe(false);

    // Verify graduation year selector is shown
    await expect(page.locator('label:has-text("Graduation Year")')).toBeVisible();
    console.log('✅ PR4: Grade 10 preview shows "Graduate to Alumni" flow with year picker');

    // Click graduate
    await page.click('button:has-text("Graduate to Alumni")');
    await page.waitForTimeout(3000);

    await expect(page.locator('text=Promotion Complete')).toBeVisible({ timeout: 8000 });
    console.log('✅ PR4: Graduation complete UI shown');

    // Verify in DB: student is now graduated
    const res = await axios.get(`${API}/students/alumni`);
    const alum = (res.data?.alumni || []).find((s: any) => s.id === id);
    expect(alum).toBeTruthy();
    expect(alum.is_graduated).toBe(true);
    console.log(`✅ PR4: DB confirms student is_graduated=true and appears in alumni list`);

    await cleanupByName(GRAD_STUDENT.name);
  });

  // ─── PR5: Promoted student no longer in original grade ───────────────────
  test('PR5 — After promotion, student is gone from original grade/section', async ({ page }) => {
    await cleanupByName(PROMO_STUDENT.name);
    const id = await createStudent(PROMO_STUDENT);

    // Promote via API directly (we already tested the UI in PR3)
    await axios.post(`${API}/students/promotion/execute`, {
      grade: 'Grade 3', section: 'E2ETEST', new_section: 'E2ENEXT',
      student_ids: [id],
    });

    await login(page);
    await goToStudents(page);

    // Filter by Grade 3 / E2ETEST
    await page.locator('select').filter({ hasText: 'All Classes' }).selectOption('Grade 3');
    await page.waitForTimeout(1000);

    const rows = await page.locator('tbody tr').allTextContents();
    const stillThere = rows.some(r => r.includes(PROMO_STUDENT.name));
    expect(stillThere).toBe(false);
    console.log('✅ PR5: Promoted student no longer appears in Grade 3 filter');

    // Student should appear in Grade 4 / E2ENEXT
    await page.locator('select').filter({ hasText: 'Grade 3' }).selectOption('Grade 4');
    await page.waitForTimeout(1000);
    const rowsG4 = await page.locator('tbody tr').allTextContents();
    const inG4 = rowsG4.some(r => r.includes(PROMO_STUDENT.name));
    expect(inG4).toBe(true);
    console.log('✅ PR5: Promoted student appears in Grade 4 after promotion');

    await cleanupByName(PROMO_STUDENT.name);
  });

  // ─── PR6: Alumni tab shows graduated student ─────────────────────────────
  test('PR6 — Alumni tab shows graduated student with graduation year', async ({ page }) => {
    await cleanupByName(GRAD_STUDENT.name);
    const id = await createStudent(GRAD_STUDENT);

    // Graduate via API
    const gradYear = new Date().getFullYear().toString();
    await axios.post(`${API}/students/graduation/execute`, {
      grade: 'Grade 10', section: 'E2ETEST',
      graduation_year: gradYear, student_ids: [id],
    });

    await login(page);
    await goToStudents(page);
    await page.click('button:has-text("Alumni")');
    await page.waitForTimeout(1500);

    // Student should appear in alumni tab
    await expect(page.locator(`tbody tr:has-text("${GRAD_STUDENT.name}")`)).toBeVisible({ timeout: 8000 });
    const rowText = await page.locator(`tbody tr:has-text("${GRAD_STUDENT.name}")`).textContent();
    expect(rowText).toContain(gradYear);
    console.log(`✅ PR6: "${GRAD_STUDENT.name}" visible in Alumni tab with graduation year ${gradYear}`);

    await cleanupByName(GRAD_STUDENT.name);
  });

});
