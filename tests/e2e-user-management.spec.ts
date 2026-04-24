import { test, expect } from '@playwright/test';
import axios from 'axios';

const BASE = 'https://cbas-frontend-production.up.railway.app';
const API  = 'https://cbas-backend-production.up.railway.app';
const ADMIN_EMAIL    = 'garkaswetha@gmail.com';
const ADMIN_PASSWORD = 'swetha123';

const TEST_TEACHER = {
  name:     'E2E Test Teacher',
  email:    'e2e.teacher@cbas.test',
  password: 'E2eTest123',
  phone:    '9876543210',
  qualification: 'BED',
  subject:  'Science',
  grade:    'Grade 6',
};

// ── helpers ───────────────────────────────────────────────────────────
async function login(page: any, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto(BASE);
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  await page.waitForTimeout(2000);
}

async function goToUsers(page: any) {
  await page.click('a:has-text("User Management"), span:has-text("User Management")');
  // Wait for the search input which is the reliable signal the page is loaded
  await page.waitForSelector('input[placeholder="Name, email or subject..."]', { timeout: 12000 });
  await page.waitForTimeout(1500); // wait for stats + assignments to load
}

async function waitForTeacherRow(page: any, name: string) {
  await page.locator(`tbody tr:has-text("${name}")`).waitFor({ state: 'visible', timeout: 8000 });
}

// ── cleanup ───────────────────────────────────────────────────────────
async function getTestTeacherUser() {
  try {
    const active = await axios.get(`${API}/users`);
    const found = active.data.find((u: any) => u.email === TEST_TEACHER.email);
    if (found) return { user: found, active: true };
    const inactive = await axios.get(`${API}/users/inactive`);
    const foundInactive = inactive.data.find((u: any) => u.email === TEST_TEACHER.email);
    if (foundInactive) return { user: foundInactive, active: false };
  } catch {}
  return null;
}

async function cleanupTestTeacher() {
  const result = await getTestTeacherUser();
  if (result) {
    try { await axios.delete(`${API}/users/${result.user.id}/permanent`); } catch {}
  }
}

async function ensureTestTeacherActive(): Promise<string> {
  // Ensure test teacher exists and is active; return their id
  const result = await getTestTeacherUser();
  if (result && result.active) return result.user.id;
  if (result && !result.active) {
    await axios.patch(`${API}/users/${result.user.id}/reactivate`);
    return result.user.id;
  }
  // Create via API
  const res = await axios.post(`${API}/users`, {
    name: TEST_TEACHER.name,
    email: TEST_TEACHER.email,
    password: TEST_TEACHER.password,
    phone: TEST_TEACHER.phone,
    appraisal_qualification: TEST_TEACHER.qualification,
    subjects: [TEST_TEACHER.subject],
    assigned_classes: [TEST_TEACHER.grade],
    role: 'teacher',
  });
  return res.data.id;
}

test.describe('E2E — User Management', () => {

  test.beforeAll(async () => { await cleanupTestTeacher(); });
  test.afterAll(async ()  => { await cleanupTestTeacher(); });

  // ── TEST 1: Stats bar loads with real data ───────────────────────────
  test('1. Stats bar loads — active count matches backend', async ({ page }) => {
    await login(page);
    await goToUsers(page);

    // Stats bar cards
    const cards = page.locator('.grid .bg-white.rounded-xl.border');
    await expect(cards.first()).toBeVisible({ timeout: 6000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const res = await axios.get(`${API}/users/stats`);
    const activeText = await page.locator('text=Active Teachers').locator('..').locator('p').first().textContent();
    expect(Number(activeText?.trim())).toBe(res.data.total);
    console.log(`✅ Stats bar: ${res.data.total} active, ${res.data.inactive} deactivated`);
  });

  // ── TEST 2: Add teacher via UI → verify all fields in DB ─────────────
  test('2. Add teacher via UI → verify all fields saved correctly in backend', async ({ page }) => {
    await login(page);
    await goToUsers(page);

    await page.click('button:has-text("+ Add Teacher")');
    await page.waitForSelector('text=Add New Teacher', { timeout: 5000 });

    await page.fill('input[placeholder="e.g. Priya Sharma"]', TEST_TEACHER.name);
    await page.fill('input[placeholder="e.g. priya@school.com"]', TEST_TEACHER.email);
    await page.fill('input[placeholder="e.g. Priya123"]', TEST_TEACHER.password);
    await page.fill('input[placeholder="e.g. 9876543210"]', TEST_TEACHER.phone);

    // Qualification select — scoped to the form
    const formSection = page.locator('.bg-white.rounded-xl.shadow.border.border-gray-200.p-5');
    await formSection.locator('select').nth(1).selectOption(TEST_TEACHER.qualification); // 0=Role, 1=Qualification
    await page.click(`button:has-text("${TEST_TEACHER.subject}")`);
    await page.click(`button:has-text("${TEST_TEACHER.grade}")`);
    await page.click('button:has-text("Save Teacher")');

    await expect(page.getByText('✅ User created')).toBeVisible({ timeout: 8000 });

    const res = await axios.get(`${API}/users`);
    const saved = res.data.find((u: any) => u.email === TEST_TEACHER.email);
    expect(saved).toBeTruthy();
    expect(saved.name).toBe(TEST_TEACHER.name);
    expect(saved.phone).toBe(TEST_TEACHER.phone);
    expect(saved.appraisal_qualification).toBe(TEST_TEACHER.qualification);
    expect(saved.subjects).toContain(TEST_TEACHER.subject);
    expect(saved.assigned_classes).toContain(TEST_TEACHER.grade);
    expect(saved.role).toBe('teacher');
    console.log(`✅ Teacher saved — ID: ${saved.id}, all fields verified`);
  });

  // ── TEST 3: Duplicate email blocked ──────────────────────────────────
  test('3. Duplicate email → error shown, no duplicate in DB', async ({ page }) => {
    await ensureTestTeacherActive();
    await login(page);
    await goToUsers(page);

    await page.click('button:has-text("+ Add Teacher")');
    await page.waitForSelector('text=Add New Teacher');
    await page.fill('input[placeholder="e.g. Priya Sharma"]', 'Duplicate Teacher');
    await page.fill('input[placeholder="e.g. priya@school.com"]', TEST_TEACHER.email);
    await page.fill('input[placeholder="e.g. Priya123"]', 'SomePass123');
    await page.click('button:has-text("Save Teacher")');

    // Error message contains "❌ Email already exists" or similar
    await expect(page.locator('text=/❌/')).toBeVisible({ timeout: 6000 });

    const res = await axios.get(`${API}/users`);
    const matches = res.data.filter((u: any) => u.email === TEST_TEACHER.email);
    expect(matches.length).toBe(1);
    console.log('✅ Duplicate email blocked — only 1 user in backend');
  });

  // ── TEST 4: Required field validation ────────────────────────────────
  test('4. Missing name/email → save blocked with error', async ({ page }) => {
    await login(page);
    await goToUsers(page);

    await page.click('button:has-text("+ Add Teacher")');
    await page.waitForSelector('text=Add New Teacher');
    await page.click('button:has-text("Save Teacher")');
    await expect(page.locator('text=/❌.*required|Name and Email/i')).toBeVisible({ timeout: 5000 });
    console.log('✅ Validation error shown for missing name/email');
  });

  // ── TEST 5: Edit teacher phone → DB updated ───────────────────────────
  test('5. Edit teacher phone → verified updated in backend', async ({ page }) => {
    await ensureTestTeacherActive();
    await login(page);
    await goToUsers(page);

    await page.fill('input[placeholder="Name, email or subject..."]', TEST_TEACHER.name);
    await waitForTeacherRow(page, TEST_TEACHER.name);
    const row = page.locator(`tbody tr:has-text("${TEST_TEACHER.name}")`);
    await row.locator('button:has-text("✏️")').click();
    await expect(page.getByText(/Edit —/)).toBeVisible({ timeout: 5000 });

    await page.fill('input[placeholder="e.g. 9876543210"]', '8888888888');
    await page.click('button:has-text("Update Teacher")');
    await expect(page.getByText('✅ User updated')).toBeVisible({ timeout: 6000 });

    const res = await axios.get(`${API}/users`);
    const saved = res.data.find((u: any) => u.email === TEST_TEACHER.email);
    expect(saved.phone).toBe('8888888888');
    console.log('✅ Phone updated in UI → confirmed in backend');
  });

  // ── TEST 6: Edit saves year-scoped assignment ─────────────────────────
  test('6. Edit saves year-scoped assignment to teacher-assignments table', async ({ page }) => {
    const id = await ensureTestTeacherActive();
    await login(page);
    await goToUsers(page);

    await page.fill('input[placeholder="Name, email or subject..."]', TEST_TEACHER.name);
    await waitForTeacherRow(page, TEST_TEACHER.name);
    const row = page.locator(`tbody tr:has-text("${TEST_TEACHER.name}")`);
    await row.locator('button:has-text("✏️")').click();
    await page.waitForSelector('text=/Edit —/');
    await page.click('button:has-text("Update Teacher")');
    await expect(page.getByText('✅ User updated')).toBeVisible({ timeout: 12000 });

    const assRes = await axios.get(`${API}/teacher-assignments/history/${id}`);
    expect(Array.isArray(assRes.data)).toBe(true);
    expect(assRes.data.length).toBeGreaterThanOrEqual(1);
    console.log(`✅ Assignment history has ${assRes.data.length} year(s) — year-scoped saving works`);
  });

  // ── TEST 7: Password toggle reveals real password ─────────────────────
  test('7. Password toggle reveals actual password stored in backend', async ({ page }) => {
    await ensureTestTeacherActive();
    await login(page);
    await goToUsers(page);

    await page.fill('input[placeholder="Name, email or subject..."]', TEST_TEACHER.name);
    await waitForTeacherRow(page, TEST_TEACHER.name);

    const row = page.locator(`tbody tr:has-text("${TEST_TEACHER.name}")`);
    await row.locator('button:has-text("🔒")').click();
    await page.waitForTimeout(300);
    const shownPassword = await row.locator('span.font-mono').textContent();

    const res = await axios.get(`${API}/users`);
    const saved = res.data.find((u: any) => u.email === TEST_TEACHER.email);
    expect(shownPassword?.trim()).toBe(saved.password);
    console.log(`✅ Password shown in UI matches backend — ${shownPassword?.trim()}`);
  });

  // ── TEST 8: Reset password modal → new password in DB ────────────────
  test('8. Reset password via modal → new password verified in backend', async ({ page }) => {
    await ensureTestTeacherActive();
    await login(page);
    await goToUsers(page);

    await page.fill('input[placeholder="Name, email or subject..."]', TEST_TEACHER.name);
    await waitForTeacherRow(page, TEST_TEACHER.name);
    const row = page.locator(`tbody tr:has-text("${TEST_TEACHER.name}")`);
    await row.locator('button:has-text("🔑")').click();

    // Modal title is "🔑 Reset Password" with teacher name below it
    await page.waitForSelector('text=Reset Password', { timeout: 5000 });
    await page.fill('input[placeholder="Enter new password"]', 'NewPass456');
    // Scope Reset button to the modal overlay to avoid ambiguity
    await page.locator('.fixed button:has-text("Reset")').click();
    await expect(page.getByText(/Password reset/)).toBeVisible({ timeout: 6000 });

    const res = await axios.get(`${API}/users`);
    const saved = res.data.find((u: any) => u.email === TEST_TEACHER.email);
    expect(saved.password).toBe('NewPass456');
    console.log('✅ Password reset via modal → confirmed new password in backend');
  });

  // ── TEST 9: Copy credentials → credentials_shared = true ─────────────
  test('9. Copy credentials → credentials_shared = true in backend', async ({ page }) => {
    await ensureTestTeacherActive();
    await login(page);
    await goToUsers(page);

    await page.fill('input[placeholder="Name, email or subject..."]', TEST_TEACHER.name);
    await waitForTeacherRow(page, TEST_TEACHER.name);
    const row = page.locator(`tbody tr:has-text("${TEST_TEACHER.name}")`);

    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await row.locator('button:has-text("📋")').click();
    await expect(page.getByText(/Credentials copied/)).toBeVisible({ timeout: 5000 });
    // mark-shared PATCH fires after the clipboard write resolves — wait for it
    await page.waitForTimeout(2000);

    const res = await axios.get(`${API}/users`);
    const saved = res.data.find((u: any) => u.email === TEST_TEACHER.email);
    expect(saved.credentials_shared).toBe(true);
    console.log('✅ credentials_shared = true in backend after copy');
  });

  // ── TEST 10: Assignment history modal ─────────────────────────────────
  test('10. Click teacher name → assignment history modal opens', async ({ page }) => {
    await ensureTestTeacherActive();
    await login(page);
    await goToUsers(page);

    await page.fill('input[placeholder="Name, email or subject..."]', TEST_TEACHER.name);
    await waitForTeacherRow(page, TEST_TEACHER.name);

    // Name button is in the 2nd td (Name column, index 1) — index 0 is the # column
    const nameBtn = page.locator(`tbody tr:has-text("${TEST_TEACHER.name}") button`)
      .filter({ hasText: TEST_TEACHER.name });
    await nameBtn.click();

    await expect(page.locator('text=/Assignment History/')).toBeVisible({ timeout: 5000 });
    console.log('✅ Assignment history modal opened from teacher name click');
  });

  // ── TEST 11: Search filter ─────────────────────────────────────────────
  test('11. Search by name filters table to matching teachers only', async ({ page }) => {
    await ensureTestTeacherActive();
    await login(page);
    await goToUsers(page);

    await page.fill('input[placeholder="Name, email or subject..."]', 'E2E Test');
    await waitForTeacherRow(page, TEST_TEACHER.name);
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(1);
    console.log(`✅ Search filtered to ${rows} row(s)`);
  });

  // ── TEST 12: Subject dropdown filter ──────────────────────────────────
  test('12. Subject filter dropdown — filters teachers by subject', async ({ page }) => {
    await login(page);
    await goToUsers(page);

    const subjectSelect = page.locator('select').filter({ hasText: /All Subjects/ });
    await subjectSelect.selectOption('Science');
    await page.waitForTimeout(500);

    const filteredRows = await page.locator('tbody tr').count();
    expect(filteredRows).toBeGreaterThanOrEqual(1);

    const res = await axios.get(`${API}/users?subject=Science`);
    expect(res.data.length).toBeGreaterThanOrEqual(1);
    console.log(`✅ Subject filter: UI shows ${filteredRows} rows, backend has ${res.data.length}`);
  });

  // ── TEST 13: Grade dropdown filter ────────────────────────────────────
  test('13. Grade filter dropdown — filters teachers by assigned grade', async ({ page }) => {
    await login(page);
    await goToUsers(page);

    const gradeSelect = page.locator('select').filter({ hasText: /All Grades/ });
    await gradeSelect.selectOption('Grade 6');
    await page.waitForTimeout(500);

    const filteredRows = await page.locator('tbody tr').count();
    expect(filteredRows).toBeGreaterThanOrEqual(1);

    const res = await axios.get(`${API}/users?grade=Grade 6`);
    expect(res.data.length).toBeGreaterThanOrEqual(1);
    console.log(`✅ Grade filter: UI ${filteredRows} rows, backend ${res.data.length}`);
  });

  // ── TEST 14: Qualification filter ─────────────────────────────────────
  test('14. Qualification filter — filters teachers by appraisal qualification', async ({ page }) => {
    await login(page);
    await goToUsers(page);

    // Use "NTT" — many teachers in the school have this qualification
    const qualSelect = page.locator('select').filter({ hasText: /All Qualifications/ });
    await qualSelect.selectOption('NTT');
    await page.waitForTimeout(500);

    const filteredRows = await page.locator('tbody tr').count();
    expect(filteredRows).toBeGreaterThanOrEqual(1);

    const res = await axios.get(`${API}/users?qualification=NTT`);
    expect(res.data.length).toBeGreaterThanOrEqual(1);
    console.log(`✅ Qualification filter: UI ${filteredRows} rows, backend ${res.data.length} NTT teachers`);
  });

  // ── TEST 15: Clear Filters restores full list ──────────────────────────
  test('15. Clear Filters button restores full teacher list', async ({ page }) => {
    await login(page);
    await goToUsers(page);
    await page.waitForTimeout(1000);
    const totalBefore = await page.locator('tbody tr').count();

    const subjectSelect = page.locator('select').filter({ hasText: /All Subjects/ });
    await subjectSelect.selectOption('Science');
    await page.waitForTimeout(500);

    await page.click('button:has-text("Clear Filters")');
    await page.waitForTimeout(500);
    const afterClear = await page.locator('tbody tr').count();

    expect(afterClear).toBe(totalBefore);
    console.log(`✅ Clear Filters restored ${afterClear} rows`);
  });

  // ── TEST 16: Academic year dropdown changes assignments ────────────────
  test('16. Changing academic year re-fetches assignments for that year', async ({ page }) => {
    await login(page);
    await goToUsers(page);

    const yearSelect = page.locator('select').filter({ hasText: /2025-26/ });
    await yearSelect.selectOption('2026-27');
    await page.waitForTimeout(1500);

    const res = await axios.get(`${API}/teacher-assignments?academic_year=2026-27`);
    expect(Array.isArray(res.data)).toBe(true);
    console.log(`✅ Year 2026-27 — backend returned ${res.data.length} assignments`);
  });

  // ── TEST 17: Login as teacher with original password ───────────────────
  test('17. Login as test teacher → Teacher Portal visible', async ({ page }) => {
    await ensureTestTeacherActive();
    // Reset password to known value first
    const result = await getTestTeacherUser();
    if (result) await axios.patch(`${API}/users/${result.user.id}/reset-password`, { password: TEST_TEACHER.password });

    await login(page, TEST_TEACHER.email, TEST_TEACHER.password);
    await page.waitForTimeout(2000);
    await expect(page.getByText('Teacher Portal')).toBeVisible({ timeout: 10000 });
    console.log('✅ Teacher can login — Teacher Portal visible');
  });

  // ── TEST 18: Deactivate teacher → moves to Deactivated tab ───────────
  test('18. Deactivate teacher → gone from active, appears in Deactivated tab', async ({ page }) => {
    await ensureTestTeacherActive();
    await login(page);
    await goToUsers(page);

    await page.fill('input[placeholder="Name, email or subject..."]', TEST_TEACHER.name);
    await waitForTeacherRow(page, TEST_TEACHER.name);
    const row = page.locator(`tbody tr:has-text("${TEST_TEACHER.name}")`);

    page.once('dialog', d => d.accept());
    await row.locator('button:has-text("🔴")').click();
    await expect(page.getByText(new RegExp(`${TEST_TEACHER.name} deactivated`))).toBeVisible({ timeout: 6000 });
    await page.waitForTimeout(1000);

    // Active list should no longer show teacher
    await page.fill('input[placeholder="Name, email or subject..."]', TEST_TEACHER.name);
    await page.waitForTimeout(500);
    const rowsAfter = await page.locator(`tbody tr:has-text("${TEST_TEACHER.name}")`).count();
    expect(rowsAfter).toBe(0);

    // Backend verify
    const activeRes = await axios.get(`${API}/users`);
    expect(activeRes.data.find((u: any) => u.email === TEST_TEACHER.email)).toBeUndefined();

    const inactiveRes = await axios.get(`${API}/users/inactive`);
    const inInactive = inactiveRes.data.find((u: any) => u.email === TEST_TEACHER.email);
    expect(inInactive).toBeTruthy();
    expect(inInactive.is_active).toBe(false);
    expect(inInactive.deactivated_at).toBeTruthy();
    console.log('✅ Deactivated: removed from active, appears in inactive API, deactivated_at set');
  });

  // ── TEST 19: Deactivated tab lists the teacher ────────────────────────
  test('19. Deactivated tab lists the teacher with deactivated date', async ({ page }) => {
    // Ensure teacher is deactivated
    const result = await getTestTeacherUser();
    if (!result) { await ensureTestTeacherActive(); const r2 = await getTestTeacherUser(); if (r2?.active) await axios.patch(`${API}/users/${r2.user.id}/deactivate`); }
    else if (result.active) await axios.patch(`${API}/users/${result.user.id}/deactivate`);

    await login(page);
    await goToUsers(page);

    // Tab button text is "Deactivated (N)"
    await page.click('button:has-text("Deactivated")');
    await page.waitForTimeout(1000);

    const inactiveRow = page.locator(`tbody tr:has-text("${TEST_TEACHER.name}")`);
    await expect(inactiveRow).toBeVisible({ timeout: 5000 });
    console.log('✅ Deactivated tab shows the teacher');
  });

  // ── TEST 20: Deactivated teacher login rejected ────────────────────────
  test('20. Deactivated teacher login → rejected (no Teacher Portal)', async ({ page }) => {
    const result = await getTestTeacherUser();
    if (result?.active) await axios.patch(`${API}/users/${result.user.id}/deactivate`);

    await page.goto(BASE);
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.fill('input[type="email"]', TEST_TEACHER.email);
    await page.fill('input[type="password"]', TEST_TEACHER.password);
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await page.waitForTimeout(2000);

    const portal = await page.getByText('Teacher Portal').isVisible().catch(() => false);
    expect(portal).toBe(false);
    console.log('✅ Deactivated teacher login correctly blocked');
  });

  // ── TEST 21: Reactivate teacher → back in active list ─────────────────
  test('21. Reactivate teacher → returns to active list, is_active=true in DB', async ({ page }) => {
    const result = await getTestTeacherUser();
    if (result?.active) await axios.patch(`${API}/users/${result.user.id}/deactivate`);
    else if (!result) { await ensureTestTeacherActive(); const r2 = await getTestTeacherUser(); if(r2?.active) await axios.patch(`${API}/users/${r2.user.id}/deactivate`); }

    await login(page);
    await goToUsers(page);

    // Click "Deactivated (N)" tab
    await page.click('button:has-text("Deactivated")');
    await page.waitForTimeout(1000);

    const inactiveRow = page.locator(`tbody tr:has-text("${TEST_TEACHER.name}")`);
    await expect(inactiveRow).toBeVisible({ timeout: 5000 });
    await inactiveRow.locator('button:has-text("Reactivate")').click();
    await expect(page.getByText(/reactivated/i)).toBeVisible({ timeout: 6000 });
    // Wait for the row to disappear from the inactive tab (UI re-fetches)
    await page.locator(`tbody tr:has-text("${TEST_TEACHER.name}")`).waitFor({ state: 'hidden', timeout: 8000 });

    const afterCount = await page.locator(`tbody tr:has-text("${TEST_TEACHER.name}")`).count();
    expect(afterCount).toBe(0);

    const activeRes = await axios.get(`${API}/users`);
    const backActive = activeRes.data.find((u: any) => u.email === TEST_TEACHER.email);
    expect(backActive).toBeTruthy();
    expect(backActive.is_active).toBe(true);
    expect(backActive.deactivated_at).toBeNull();
    console.log('✅ Reactivated: is_active=true, deactivated_at=null in DB');
  });

  // ── TEST 22: Permanent delete from Deactivated tab ────────────────────
  test('22. Permanently delete from Deactivated tab → removed from DB', async ({ page }) => {
    // Deactivate teacher first via API
    const result = await getTestTeacherUser();
    if (!result) await ensureTestTeacherActive();
    const r2 = await getTestTeacherUser();
    if (r2?.active) await axios.patch(`${API}/users/${r2.user.id}/deactivate`);

    await login(page);
    await goToUsers(page);
    await page.click('button:has-text("Deactivated")');
    await page.waitForTimeout(1000);

    const inactiveRow = page.locator(`tbody tr:has-text("${TEST_TEACHER.name}")`);
    await expect(inactiveRow).toBeVisible({ timeout: 5000 });

    page.once('dialog', d => d.accept());
    await inactiveRow.locator('button:has-text("Delete")').click();
    await expect(page.getByText(/deleted/i)).toBeVisible({ timeout: 6000 });
    await page.waitForTimeout(1000);

    const activeAfter = await axios.get(`${API}/users`);
    const inactiveAfter = await axios.get(`${API}/users/inactive`);
    expect(activeAfter.data.find((u: any) => u.email === TEST_TEACHER.email)).toBeUndefined();
    expect(inactiveAfter.data.find((u: any) => u.email === TEST_TEACHER.email)).toBeUndefined();
    console.log('✅ Permanent delete → completely removed from DB');
  });

  // ── TEST 23: Import panel opens with correct elements ─────────────────
  test('23. Import Excel panel opens — file input and panel title visible', async ({ page }) => {
    await login(page);
    await goToUsers(page);

    await page.click('button:has-text("📥 Import Excel")');
    await expect(page.getByText('Import Teachers from Excel')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[type="file"]')).toBeVisible();
    // The import button is only shown after parsing a file — just verify panel opened
    await expect(page.getByText('Upload Excel')).toBeVisible();

    // Close — scope to import panel to avoid hitting the invisible sidebar ✕
    await page.locator('.bg-white.rounded-xl.shadow.border.border-gray-200.p-5 button:has-text("✕")').click();
    await expect(page.getByText('Import Teachers from Excel')).not.toBeVisible({ timeout: 3000 });
    console.log('✅ Import panel opens and closes correctly');
  });

  // ── TEST 24: Last Login column shows "Never" for new teacher ──────────
  test('24. Last Login column shows "Never" for new teacher', async ({ page }) => {
    const fresh = { name: 'E2E Fresh Login', email: 'e2e.fresh.login@cbas.test', password: 'Fresh123', role: 'teacher' };
    try { await axios.post(`${API}/users`, fresh); } catch {}

    await login(page);
    await goToUsers(page);
    await page.fill('input[placeholder="Name, email or subject..."]', fresh.name);
    await waitForTeacherRow(page, fresh.name);

    const row = page.locator(`tbody tr:has-text("${fresh.name}")`);
    const rowText = await row.textContent();
    expect(rowText).toContain('Never');
    console.log('✅ New teacher shows "Never" in Last Login column');

    const res = await axios.get(`${API}/users`);
    const u = res.data.find((u: any) => u.email === fresh.email);
    if (u) await axios.delete(`${API}/users/${u.id}/permanent`);
  });

  // ── TEST 25: Last Login updates after teacher logs in ─────────────────
  test('25. Last Login updates after teacher successfully logs in', async ({ page }) => {
    await ensureTestTeacherActive();
    const result = await getTestTeacherUser();
    if (result) await axios.patch(`${API}/users/${result.user.id}/reset-password`, { password: TEST_TEACHER.password });

    // Login as teacher
    await login(page, TEST_TEACHER.email, TEST_TEACHER.password);
    await page.waitForTimeout(1000);

    // Login as admin and check last_login_at
    const res = await axios.get(`${API}/users`);
    const saved = res.data.find((u: any) => u.email === TEST_TEACHER.email);
    expect(saved.last_login_at).toBeTruthy();

    const loginDate = new Date(saved.last_login_at);
    const now = new Date();
    const diffMs = now.getTime() - loginDate.getTime();
    expect(diffMs).toBeLessThan(5 * 60 * 1000); // within last 5 minutes
    console.log(`✅ last_login_at set to ${loginDate.toISOString()} (${Math.round(diffMs/1000)}s ago)`);
  });

});
