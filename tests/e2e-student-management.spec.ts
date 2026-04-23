import { test, expect } from '@playwright/test';
import axios from 'axios';

const BASE = 'https://cbas-frontend-production.up.railway.app';
const API  = 'https://cbas-backend-production.up.railway.app';
const ADMIN_EMAIL    = 'garkaswetha@gmail.com';
const ADMIN_PASSWORD = 'swetha123';

const TEST_STUDENT = {
  name: 'E2E Test Student',
  admission_no: 'E2E-001',
  current_class: 'Grade 3',
  section: 'HIMALAYA',
  gender: 'Male',
  phone: '9000000001',
  father_name: 'E2E Father',
  mother_name: 'E2E Mother',
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

async function getTestStudent() {
  try {
    const res = await axios.get(`${API}/students`, { params: { search: TEST_STUDENT.name } });
    const found = res.data.find((s: any) => s.name === TEST_STUDENT.name);
    if (found) return { student: found, active: true };
  } catch {}
  try {
    const res = await axios.get(`${API}/students/tc-register`);
    const found = res.data.find((s: any) => s.name === TEST_STUDENT.name);
    if (found) return { student: found, active: false };
  } catch {}
  return null;
}

async function cleanupTestStudent() {
  // Delete ALL records whose name contains "E2E Test Student" (handles renamed/stale records)
  try {
    const res = await axios.get(`${API}/students`, { params: { search: 'E2E Test Student' } });
    for (const s of res.data) {
      if (s.name.includes('E2E Test Student')) {
        try { await axios.delete(`${API}/students/${s.id}/permanent`); } catch {}
      }
    }
  } catch {}
  try {
    const res = await axios.get(`${API}/students/tc-register`);
    for (const s of res.data) {
      if (s.name.includes('E2E Test Student')) {
        try { await axios.delete(`${API}/students/${s.id}/permanent`); } catch {}
      }
    }
  } catch {}
}

async function ensureTestStudentActive(): Promise<string> {
  await cleanupTestStudent();
  const res = await axios.post(`${API}/students`, TEST_STUDENT);
  return res.data.id;
}

test.describe('Student Management', () => {

  test('1. Page shows Student Management header and stats', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    await expect(page.locator('h1:has-text("Student Management")')).toBeVisible();
    await expect(page.locator('p:has-text("active students")')).toBeVisible();
  });

  test('2. Stats bar shows grade cards', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    const gradeCards = page.locator('.cursor-pointer.rounded-lg');
    await expect(gradeCards.first()).toBeVisible({ timeout: 8000 });
  });

  test('3. Three tabs: Active Students, TC Register, Alumni', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    await expect(page.locator('button:has-text("Active Students")')).toBeVisible();
    await expect(page.locator('button:has-text("TC Register")')).toBeVisible();
    await expect(page.locator('button:has-text("Alumni")')).toBeVisible();
  });

  test('4. Active Students tab shows student table with columns', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    await expect(page.locator('table')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('th:has-text("Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Class")')).toBeVisible();
    await expect(page.locator('th:has-text("Section")')).toBeVisible();
  });

  test('5. Search by name filters the student list', async ({ page }) => {
    await ensureTestStudentActive();
    await login(page);
    await goToStudents(page);
    const searchInput = page.locator('input[placeholder="Search by name..."]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('E2E Test Student');
    await page.waitForTimeout(1500);
    await expect(page.locator('tbody tr:has-text("E2E Test Student")')).toBeVisible({ timeout: 8000 });
    await cleanupTestStudent();
  });

  test('6. Class dropdown filters by grade', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    await page.locator('select').filter({ hasText: 'All Classes' }).selectOption('Grade 3');
    await page.waitForTimeout(1500);
    await expect(page.locator('text=Showing')).toBeVisible();
    await expect(page.locator('button:has-text("Clear Filters")')).toBeVisible();
  });

  test('7. Clear Filters resets all filters', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    await page.locator('select').filter({ hasText: 'All Classes' }).selectOption('Grade 3');
    await page.waitForTimeout(800);
    const clearBtn = page.locator('button:has-text("Clear Filters")');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await page.waitForTimeout(800);
    await expect(clearBtn).not.toBeVisible();
  });

  test('8. Clicking a grade card highlights it', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    const firstCard = page.locator('.cursor-pointer.rounded-lg').first();
    await firstCard.click();
    await page.waitForTimeout(1500);
    await expect(page.locator('.bg-indigo-600.text-white.cursor-pointer')).toBeVisible();
  });

  test('9. Add Student button opens form and Cancel closes it', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    await page.click('button:has-text("+ Add Student")');
    await expect(page.locator('text=Add New Student')).toBeVisible();
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
    await page.click('button:has-text("Cancel")');
    await expect(page.locator('text=Add New Student')).not.toBeVisible();
  });

  test('10. Add Student: fill form and save creates student', async ({ page }) => {
    await cleanupTestStudent();
    await login(page);
    await goToStudents(page);
    await page.click('button:has-text("+ Add Student")');
    await page.waitForSelector('text=Add New Student', { timeout: 5000 });
    await page.locator('input[type="text"]').first().fill(TEST_STUDENT.name);
    await page.locator('input[type="text"]').nth(1).fill(TEST_STUDENT.admission_no);
    await page.locator('select').filter({ hasText: '-- Select --' }).first().selectOption('Grade 3');
    await page.waitForTimeout(800);
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=E2E Test Student added')).toBeVisible({ timeout: 10000 });
    await cleanupTestStudent();
  });

  test('11. Section field responds when class is selected in form', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    await page.click('button:has-text("+ Add Student")');
    await page.waitForSelector('text=Add New Student');
    const classSelect = page.locator('select').filter({ hasText: '-- Select --' }).first();
    await classSelect.selectOption('Grade 1');
    await page.waitForTimeout(1200);
    const sectionSelect = page.locator('select').filter({ hasText: '-- Select --' });
    const sectionInput = page.locator('input[placeholder="e.g. HIMALAYA"]');
    const hasSelect = await sectionSelect.count() > 0;
    const hasInput = await sectionInput.count() > 0;
    expect(hasSelect || hasInput).toBeTruthy();
    await page.click('button:has-text("Cancel")');
  });

  test('12. Edit Student: modify name and update', async ({ page }) => {
    await ensureTestStudentActive();
    await login(page);
    await goToStudents(page);
    const searchInput = page.locator('input[placeholder="Search by name..."]');
    await searchInput.fill('E2E Test Student');
    await page.waitForTimeout(1500);
    const editBtn = page.locator('tbody tr:has-text("E2E Test Student") button:has-text("Edit")').first();
    await editBtn.click();
    await page.waitForSelector('text=Edit Student', { timeout: 5000 });
    const nameInput = page.locator('input[type="text"]').first();
    await nameInput.clear();
    await nameInput.fill('E2E Test Student Updated');
    await page.click('button:has-text("Update")');
    await expect(page.locator('.bg-green-50:has-text("updated")')).toBeVisible({ timeout: 10000 });
    await searchInput.fill('E2E Test Student Updated');
    await page.waitForTimeout(1500);
    await page.locator('tbody tr:has-text("E2E Test Student Updated") button:has-text("Edit")').click();
    await page.waitForSelector('text=Edit Student');
    const nameInput2 = page.locator('input[type="text"]').first();
    await nameInput2.clear();
    await nameInput2.fill('E2E Test Student');
    await page.click('button:has-text("Update")');
    await page.waitForTimeout(1000);
    await cleanupTestStudent();
  });

  test('13. Click student name opens profile modal with fields', async ({ page }) => {
    await ensureTestStudentActive();
    await login(page);
    await goToStudents(page);
    const searchInput = page.locator('input[placeholder="Search by name..."]');
    await searchInput.fill('E2E Test Student');
    await page.waitForTimeout(1500);
    const nameBtn = page.locator('tbody tr:has-text("E2E Test Student") button').first();
    await nameBtn.click();
    await page.waitForTimeout(800);
    await expect(page.locator('text=Father Name')).toBeVisible({ timeout: 6000 });
    await expect(page.locator('button:has-text("Edit Student")')).toBeVisible();
    await page.click('button:has-text("Close")');
    await cleanupTestStudent();
  });

  test('14. Profile modal Edit Student button opens edit form', async ({ page }) => {
    await ensureTestStudentActive();
    await login(page);
    await goToStudents(page);
    const searchInput = page.locator('input[placeholder="Search by name..."]');
    await searchInput.fill('E2E Test Student');
    await page.waitForTimeout(1500);
    await page.locator('tbody tr:has-text("E2E Test Student") button').first().click();
    await page.waitForTimeout(1000);
    await page.click('button:has-text("Edit Student")');
    await expect(page.locator('text=Edit Student')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Cancel")');
    await cleanupTestStudent();
  });

  test('15. TC button opens TC modal with date and reason fields', async ({ page }) => {
    await ensureTestStudentActive();
    await login(page);
    await goToStudents(page);
    const searchInput = page.locator('input[placeholder="Search by name..."]');
    await searchInput.fill('E2E Test Student');
    await page.waitForTimeout(1500);
    await page.locator('tbody tr:has-text("E2E Test Student") button:has-text("TC")').first().click();
    await expect(page.locator('text=Issue Transfer Certificate')).toBeVisible({ timeout: 6000 });
    await expect(page.locator('text=TC Date')).toBeVisible();
    await expect(page.locator('text=Reason')).toBeVisible();
    await expect(page.locator('input[type="date"]')).toBeVisible();
    await page.click('button:has-text("Cancel")');
    await expect(page.locator('text=Issue Transfer Certificate')).not.toBeVisible();
    await cleanupTestStudent();
  });

  test('16. Issue TC removes student from active list', async ({ page }) => {
    await ensureTestStudentActive();
    await login(page);
    await goToStudents(page);
    const searchInput = page.locator('input[placeholder="Search by name..."]');
    await searchInput.fill('E2E Test Student');
    await page.waitForTimeout(1500);
    await page.locator('tbody tr:has-text("E2E Test Student") button:has-text("TC")').first().click();
    await page.waitForSelector('text=Issue Transfer Certificate', { timeout: 6000 });
    await page.fill('input[placeholder="e.g. Relocation, School change..."]', 'School transfer');
    await page.click('button:has-text("Issue TC")');
    await expect(page.locator('text=TC issued to E2E Test Student')).toBeVisible({ timeout: 10000 });
    await searchInput.fill('E2E Test Student');
    await page.waitForTimeout(1500);
    await expect(page.locator('tbody tr:has-text("E2E Test Student")')).not.toBeVisible({ timeout: 5000 });
  });

  test('17. TC Register tab shows TC student with date and reason columns', async ({ page }) => {
    const result = await getTestStudent();
    if (!result || result.active) {
      const id = await ensureTestStudentActive();
      await axios.patch(`${API}/students/${id}/tc`, {
        tc_date: new Date().toISOString().split('T')[0],
        tc_reason: 'School transfer',
      });
    }
    await login(page);
    await goToStudents(page);
    await page.click('button:has-text("TC Register")');
    await page.waitForTimeout(1500);
    await expect(page.locator('tbody tr:has-text("E2E Test Student")')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('th:has-text("TC Date")')).toBeVisible();
    await expect(page.locator('th:has-text("Reason")')).toBeVisible();
  });

  test('18. TC Register: permanent delete removes student record', async ({ page }) => {
    const result = await getTestStudent();
    if (!result || result.active) {
      const id = await ensureTestStudentActive();
      await axios.patch(`${API}/students/${id}/tc`, {
        tc_date: new Date().toISOString().split('T')[0],
        tc_reason: 'Test cleanup',
      });
    }
    await login(page);
    await goToStudents(page);
    await page.click('button:has-text("TC Register")');
    await page.waitForTimeout(1500);
    const row = page.locator('tbody tr:has-text("E2E Test Student")');
    await row.waitFor({ state: 'visible', timeout: 8000 });
    page.on('dialog', async dialog => { await dialog.accept(); });
    await row.locator('button:has-text("Delete")').click();
    await expect(page.locator('text=permanently deleted')).toBeVisible({ timeout: 8000 });
    await expect(row).not.toBeVisible({ timeout: 5000 });
  });

  test('19. Alumni tab shows heading and year filter dropdown', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    await page.click('button:has-text("Alumni")');
    await page.waitForTimeout(1500);
    await expect(page.locator('h2:has-text("Alumni")')).toBeVisible();
    await expect(page.locator('select').filter({ hasText: 'All Years' })).toBeVisible();
  });

  test('20. Alumni tab shows records or empty state message', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    await page.click('button:has-text("Alumni")');
    await page.waitForTimeout(1500);
    const hasRecords = await page.locator('tbody tr').count() > 0;
    if (!hasRecords) {
      await expect(page.locator('text=No alumni records found')).toBeVisible();
    } else {
      await expect(page.locator('th:has-text("Graduated")')).toBeVisible();
    }
  });

  test('21. Promote Students wizard opens with grade and section selects', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    await page.click('button:has-text("Promote Students")');
    await page.waitForTimeout(1000);
    await expect(page.locator('label:has-text("Current Grade")')).toBeVisible({ timeout: 6000 });
    await expect(page.locator('label:has-text("Current Section")')).toBeVisible();
    await expect(page.locator('button:has-text("Preview Promotion")')).toBeVisible();
    // Close wizard: the ✕ inside the modal (bg-white rounded-xl)
    await page.locator('.bg-white.rounded-xl button:has-text("✕")').last().click();
    await page.waitForTimeout(500);
  });

  test('22. Promotion wizard: selecting a grade enables section dropdown', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    await page.click('button:has-text("Promote Students")');
    await page.waitForSelector('label:has-text("Current Grade")', { timeout: 6000 });
    const gradeSelect = page.locator('select').filter({ hasText: '-- Select Grade --' });
    await gradeSelect.selectOption('Grade 3');
    await page.waitForTimeout(1200);
    const sectionSelect = page.locator('select').filter({ hasText: '-- Select Section --' });
    const isDisabled = await sectionSelect.evaluate((el: any) => el.disabled);
    expect(isDisabled).toBeFalsy();
    await page.locator('.bg-white.rounded-xl button:has-text("✕")').last().click();
  });

  test('23. Export Excel triggers file download', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    await page.waitForTimeout(2000);
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await page.click('button:has-text("Export Excel")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.xlsx');
  });

  test('24. Import Excel button triggers file chooser', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    const fileInput = page.locator('input[type="file"][accept=".xlsx,.xls"]');
    await expect(fileInput).toBeAttached();
    const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 5000 });
    await page.click('button:has-text("Import Excel")');
    const fileChooser = await fileChooserPromise;
    expect(fileChooser).toBeTruthy();
  });

  test('25. Showing X students count is displayed in filter bar', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    await page.waitForSelector('text=Showing', { timeout: 8000 });
    const text = await page.locator('text=Showing').first().textContent();
    expect(text).toMatch(/Showing \d+ students/);
  });

  test('26. Header subtitle shows active count and TC count', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    await expect(page.locator("text=TC'd")).toBeVisible({ timeout: 8000 });
  });

  test('27. TC Register tab button label includes count', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    const tcTab = page.locator('button:has-text("TC Register")');
    const tabText = await tcTab.textContent();
    expect(tabText).toMatch(/TC Register \(\d+\)/);
  });

  test('28. Active Students tab button label includes total count', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    const activeTab = page.locator('button:has-text("Active Students")');
    const tabText = await activeTab.textContent();
    expect(tabText).toMatch(/Active Students \(\d+\)/);
  });

  test('29. Switching tabs shows correct content for each', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    await page.click('button:has-text("TC Register")');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Students who have been issued Transfer Certificates')).toBeVisible();
    await page.click('button:has-text("Alumni")');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Students who completed Grade 10')).toBeVisible();
    await page.click('button:has-text("Active Students")');
    await page.waitForTimeout(1000);
    await expect(page.locator('th:has-text("Name")')).toBeVisible();
  });

  test('30. Add Student form shows error when name is empty', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    await page.click('button:has-text("+ Add Student")');
    await page.waitForSelector('text=Add New Student');
    await page.click('button:has-text("Save")');
    await expect(page.locator('text=Name is required')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Cancel")');
  });

});
