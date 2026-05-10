import { test, expect } from '@playwright/test';
import axios from 'axios';

const BASE = 'https://cbas-frontend-production.up.railway.app';
const API  = 'https://cbas-backend-production.up.railway.app';
const ADMIN_EMAIL    = 'garkaswetha@gmail.com';
const ADMIN_PASSWORD = 'swetha123';

// Dedicated test teacher — different email from existing e2e-user-management tests
const T = {
  name:          'E2E Mapping Teacher',
  email:         'e2e.mapping@cbas.test',
  password:      'Mapping123',
  grade:         'Grade 6',
  section:       'Sathya',          // a real Grade 6 section
  classTeacherOf:'Grade 6 Sathya',  // matches grade + section
};

// ── helpers ─────────────────────────────────────────────────────────────────

async function login(page: any) {
  await page.goto(BASE);
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  await page.waitForTimeout(2000);
}

async function goToUsers(page: any) {
  await page.click('a:has-text("User Management"), span:has-text("User Management")');
  await page.waitForSelector('input[placeholder="Name, email or subject..."]', { timeout: 12000 });
  await page.waitForTimeout(1500);
}

async function findTeacher() {
  try {
    const active = await axios.get(`${API}/users`, { validateStatus: () => true });
    const found = (active.data || []).find((u: any) => u.email === T.email);
    if (found) return { user: found, active: true };
    const inactive = await axios.get(`${API}/users/inactive`, { validateStatus: () => true });
    const foundI = (inactive.data || []).find((u: any) => u.email === T.email);
    if (foundI) return { user: foundI, active: false };
  } catch {}
  return null;
}

async function deleteTeacher() {
  const result = await findTeacher();
  if (result) {
    try { await axios.delete(`${API}/users/${result.user.id}/permanent`); } catch {}
  }
}

async function ensureTeacherActive(): Promise<string> {
  const result = await findTeacher();
  if (result?.active) return result.user.id;
  if (result && !result.active) {
    await axios.patch(`${API}/users/${result.user.id}/reactivate`);
    return result.user.id;
  }
  const res = await axios.post(`${API}/users`, {
    name: T.name, email: T.email, password: T.password,
    role: 'teacher', assigned_classes: [T.grade],
  });
  return res.data.id;
}

// ── setup / teardown ─────────────────────────────────────────────────────────

test.describe('Teacher Mapping — assigned sections & class teacher', () => {

  test.beforeAll(async () => { await deleteTeacher(); });
  test.afterAll(async ()  => { await deleteTeacher(); });

  // ── TM1: sections toggle buttons shown in form ────────────────────────────
  test('TM1 — Add teacher form shows Assigned Sections toggle buttons', async ({ page }) => {
    await login(page);
    await goToUsers(page);

    await page.click('button:has-text("+ Add Teacher")');
    await page.waitForSelector('text=Add New Teacher', { timeout: 5000 });

    // Section label must be visible
    await expect(page.locator('label:has-text("Assigned Sections")')).toBeVisible();

    // Section toggle buttons (purple when selected) — at least one visible
    const sectionBtns = page.locator('label:has-text("Assigned Sections")').locator('..').locator('button');
    const count = await sectionBtns.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✅ TM1: ${count} section toggle buttons visible in form`);
  });

  // ── TM2: Class Teacher Of text input present in form ─────────────────────
  test('TM2 — Add teacher form has "Class Teacher Of" text input', async ({ page }) => {
    await login(page);
    await goToUsers(page);

    await page.click('button:has-text("+ Add Teacher")');
    await page.waitForSelector('text=Add New Teacher', { timeout: 5000 });

    const classTeacherInput = page.locator('input[placeholder="e.g. Grade 5 Kaveri"]');
    await expect(classTeacherInput).toBeVisible();
    console.log('✅ TM2: "Class Teacher Of" text input visible in form');
  });

  // ── TM3: Add teacher with section → backend assigned_sections correct ─────
  test('TM3 — Add teacher with section assigned → assigned_sections saved in backend', async ({ page }) => {
    await login(page);
    await goToUsers(page);

    await page.click('button:has-text("+ Add Teacher")');
    await page.waitForSelector('text=Add New Teacher', { timeout: 5000 });

    // Fill required fields
    await page.fill('input[placeholder="e.g. Priya Sharma"]', T.name);
    await page.fill('input[placeholder="e.g. priya@school.com"]', T.email);
    await page.fill('input[placeholder="e.g. Priya123"]', T.password);

    // Select grade (blue toggle)
    await page.click(`button:has-text("${T.grade}")`);
    await page.waitForTimeout(300);

    // Select section (purple toggle) — Sathya
    await page.click(`button:has-text("${T.section}")`);
    await page.waitForTimeout(300);

    await page.click('button:has-text("Save Teacher")');
    await expect(page.getByText('✅ User created')).toBeVisible({ timeout: 8000 });

    // API verify
    const res = await axios.get(`${API}/users`);
    const saved = res.data.find((u: any) => u.email === T.email);
    expect(saved).toBeTruthy();
    expect(saved.assigned_sections).toContain(T.section);
    console.log(`✅ TM3: assigned_sections includes "${T.section}" — API: ${JSON.stringify(saved.assigned_sections)}`);
  });

  // ── TM4: Table row shows assigned grade (sections are in backend only, not a separate table column)
  test('TM4 — Table row shows assigned grade and teacher appears in list', async ({ page }) => {
    await ensureTeacherActive();
    await login(page);
    await goToUsers(page);

    await page.fill('input[placeholder="Name, email or subject..."]', T.name);
    await page.locator(`tbody tr:has-text("${T.name}")`).waitFor({ state: 'visible', timeout: 8000 });

    const row = page.locator(`tbody tr:has-text("${T.name}")`);
    const rowText = await row.textContent();
    // The "Classes" column shows the assigned grade; sections are stored in backend but not a separate column
    expect(rowText).toContain(T.grade);
    console.log(`✅ TM4: Teacher row visible with grade "${T.grade}" — row: "${rowText?.slice(0, 80)}"`);
  });

  // ── TM5: Edit form pre-fills section selection ────────────────────────────
  test('TM5 — Edit form pre-fills existing sections as selected (purple)', async ({ page }) => {
    await ensureTeacherActive();
    await login(page);
    await goToUsers(page);

    await page.fill('input[placeholder="Name, email or subject..."]', T.name);
    await page.locator(`tbody tr:has-text("${T.name}")`).waitFor({ state: 'visible', timeout: 8000 });
    await page.locator(`tbody tr:has-text("${T.name}") button:has-text("✏️")`).click();
    await expect(page.getByText(/Edit —/)).toBeVisible({ timeout: 5000 });
    // Wait for React to finish batching the form pre-fill (assigned_sections loads with user data)
    await page.waitForTimeout(1500);

    // Scope to the Assigned Sections label's parent div to avoid matching buttons elsewhere
    const sectionsArea = page.locator('label').filter({ hasText: /Assigned Sections/ }).locator('..');
    // Use exact-match regex so "Sathya" doesn't match "Sathyam" etc.
    const sectionBtn = sectionsArea.locator('button').filter({ hasText: /^Sathya$/ });
    const cls = await sectionBtn.getAttribute('class') || '';
    expect(cls).toContain('bg-purple-600');
    console.log(`✅ TM5: Section button "${T.section}" is pre-selected (purple) in edit form`);
  });

  // ── TM6: Add class_teacher_of → backend updated, table shows 👑 badge ────
  test('TM6 — Edit teacher: set class_teacher_of → backend updated + 👑 badge in table', async ({ page }) => {
    await ensureTeacherActive();
    await login(page);
    await goToUsers(page);

    await page.fill('input[placeholder="Name, email or subject..."]', T.name);
    await page.locator(`tbody tr:has-text("${T.name}")`).waitFor({ state: 'visible', timeout: 8000 });
    await page.locator(`tbody tr:has-text("${T.name}") button:has-text("✏️")`).click();
    await expect(page.getByText(/Edit —/)).toBeVisible({ timeout: 5000 });

    // Fill Class Teacher Of field
    const classTeacherInput = page.locator('input[placeholder="e.g. Grade 5 Kaveri"]');
    await classTeacherInput.clear();
    await classTeacherInput.fill(T.classTeacherOf);

    await page.click('button:has-text("Update Teacher")');
    await expect(page.getByText('✅ User updated')).toBeVisible({ timeout: 8000 });

    // API verify
    const res = await axios.get(`${API}/users`);
    const saved = res.data.find((u: any) => u.email === T.email);
    expect(saved.class_teacher_of).toBe(T.classTeacherOf);
    console.log(`✅ TM6: class_teacher_of="${T.classTeacherOf}" saved in backend`);

    // Table must show 👑 badge
    await page.fill('input[placeholder="Name, email or subject..."]', T.name);
    await page.locator(`tbody tr:has-text("${T.name}")`).waitFor({ state: 'visible', timeout: 8000 });
    const row = page.locator(`tbody tr:has-text("${T.name}")`);
    await expect(row.locator(`span:has-text("${T.classTeacherOf}")`)).toBeVisible({ timeout: 5000 });
    const rowText = await row.textContent();
    expect(rowText).toContain('👑');
    console.log(`✅ TM6: 👑 badge visible in table for ${T.name}`);
  });

  // ── TM7: Clear class_teacher_of → backend null, 👑 gone ──────────────────
  test('TM7 — Edit teacher: clear class_teacher_of → backend null, 👑 badge gone', async ({ page }) => {
    // Ensure teacher has class_teacher_of set
    const result = await findTeacher();
    if (result) {
      await axios.patch(`${API}/users/${result.user.id}`, { class_teacher_of: T.classTeacherOf })
        .catch(() => {}); // some backends may not have PATCH — handled via UI below
    }

    await login(page);
    await goToUsers(page);

    await page.fill('input[placeholder="Name, email or subject..."]', T.name);
    await page.locator(`tbody tr:has-text("${T.name}")`).waitFor({ state: 'visible', timeout: 8000 });
    await page.locator(`tbody tr:has-text("${T.name}") button:has-text("✏️")`).click();
    await expect(page.getByText(/Edit —/)).toBeVisible({ timeout: 5000 });

    const classTeacherInput = page.locator('input[placeholder="e.g. Grade 5 Kaveri"]');
    await classTeacherInput.clear();

    await page.click('button:has-text("Update Teacher")');
    await expect(page.getByText('✅ User updated')).toBeVisible({ timeout: 8000 });

    // API verify
    const res = await axios.get(`${API}/users`);
    const saved = res.data.find((u: any) => u.email === T.email);
    expect(saved.class_teacher_of || '').toBe('');
    console.log('✅ TM7: class_teacher_of cleared — backend is empty/null');

    // Table: 👑 badge gone
    await page.fill('input[placeholder="Name, email or subject..."]', T.name);
    await page.locator(`tbody tr:has-text("${T.name}")`).waitFor({ state: 'visible', timeout: 8000 });
    const row = page.locator(`tbody tr:has-text("${T.name}")`);
    const rowText = await row.textContent();
    expect(rowText).not.toContain('👑');
    console.log('✅ TM7: 👑 badge gone from table row');
  });

  // ── TM8: Section toggle in edit form changes backend ─────────────────────
  test('TM8 — Edit teacher: section toggle (on→off or off→on) updates assigned_sections in backend', async ({ page }) => {
    await ensureTeacherActive();
    await login(page);
    await goToUsers(page);

    await page.fill('input[placeholder="Name, email or subject..."]', T.name);
    await page.locator(`tbody tr:has-text("${T.name}")`).waitFor({ state: 'visible', timeout: 8000 });
    await page.locator(`tbody tr:has-text("${T.name}") button:has-text("✏️")`).click();
    await expect(page.getByText(/Edit —/)).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1500);

    // Scope to the Assigned Sections area to avoid matching other buttons
    const sectionsArea = page.locator('label').filter({ hasText: /Assigned Sections/ }).locator('..');
    const sectionBtn = sectionsArea.locator('button').filter({ hasText: /^Sathya$/ });

    // Read current toggle state — button is purple if pre-filled, white if not
    const clsBefore = await sectionBtn.getAttribute('class') || '';
    const wasSelected = clsBefore.includes('bg-purple-600');

    // Click once to toggle to the opposite state
    await sectionBtn.click();
    await page.waitForTimeout(300);

    // Verify the UI shows the toggled state before saving
    const clsAfter = await sectionBtn.getAttribute('class') || '';
    expect(clsAfter.includes('bg-purple-600')).toBe(!wasSelected);

    await page.click('button:has-text("Update Teacher")');
    await expect(page.getByText('✅ User updated')).toBeVisible({ timeout: 8000 });

    // API verify: section presence should be the OPPOSITE of what it was before
    const res = await axios.get(`${API}/users`);
    const saved = res.data.find((u: any) => u.email === T.email);
    const hasNow = (saved.assigned_sections || []).includes(T.section);
    expect(hasNow).toBe(!wasSelected);
    console.log(`✅ TM8: Section toggled ${wasSelected ? 'selected→removed' : 'unselected→added'} — API: ${JSON.stringify(saved.assigned_sections)}`);
  });

  // ── TM9: Class Teacher column visible in table header ────────────────────
  test('TM9 — User table has "Class Teacher" column header', async ({ page }) => {
    await login(page);
    await goToUsers(page);

    await expect(page.locator('th:has-text("Class Teacher")')).toBeVisible({ timeout: 5000 });
    console.log('✅ TM9: "Class Teacher" column header visible in user table');
  });

  // ── TM10: Existing real teacher with class_teacher_of shows 👑 in table ──
  test('TM10 — Existing teacher with class_teacher_of shows 👑 badge in table', async ({ page }) => {
    // Find any real teacher who has class_teacher_of set
    const res = await axios.get(`${API}/users`);
    const withCT = (res.data as any[]).find((u: any) => u.class_teacher_of && u.class_teacher_of.length > 0);
    if (!withCT) { console.log('ℹ️  No teacher with class_teacher_of found — skip'); return; }

    await login(page);
    await goToUsers(page);

    await page.fill('input[placeholder="Name, email or subject..."]', withCT.name);
    await page.locator(`tbody tr:has-text("${withCT.name}")`).waitFor({ state: 'visible', timeout: 8000 });

    const row = page.locator(`tbody tr:has-text("${withCT.name}")`);
    await expect(row.locator(`span:has-text("${withCT.class_teacher_of}")`)).toBeVisible({ timeout: 5000 });
    const rowText = await row.textContent();
    expect(rowText).toContain('👑');
    console.log(`✅ TM10: ${withCT.name} — 👑 ${withCT.class_teacher_of} visible in table`);
  });

});
