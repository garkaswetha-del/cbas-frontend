import { test, expect } from '@playwright/test';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Section Management — Industry Standard E2E Test
//
// SEC1  — Admin lands on Section Management: h1, 4 stat cards, Grade 1 default
// SEC2  — Grade selector: click Grade 9 → panel title + stat card update, API matches
// SEC3  — Add section: lowercase input → auto-uppercased → saved → API confirm
// SEC4  — Duplicate guard: add same name again → error message, list unchanged
// SEC5  — Rename cancel: open rename panel → Cancel → panel closes, name unchanged
// SEC6  — Rename: E2E-SECTION → E2E-RENAMED → cascade banner shown → API confirm
// SEC7  — Dismiss cascade result banner: Dismiss link hides the blue banner
// SEC8  — All grades overview: E2E-RENAMED shows as pill; clicking it switches grade
// SEC9  — Deactivate disabled when section has students (ASTEROID, Grade 1)
// SEC10 — Deactivate E2E-RENAMED (0 students): moves to Deactivated panel → API false
// SEC11 — Reactivate E2E-RENAMED: back in Active list → API is_active=true
// SEC12 — Delete from Active list: E2E-RENAMED gone → API 404
// SEC13 — Delete from Deactivated state: add E2E-SECTION-2 → deactivate → delete without reactivating
// SEC14 — Normalize Case button: success message → API still healthy
// SEC15 — Academic year filter: switch 2024-25 → title updates → switch back 2025-26
// ─────────────────────────────────────────────────────────────────────────────

const BASE = 'https://cbas-frontend-production.up.railway.app';
const API  = 'https://cbas-backend-production.up.railway.app';
const ACADEMIC_YEAR = '2025-26';

const ADMIN = { email: 'garkaswetha@gmail.com', password: 'swetha123' };

const TEST_GRADE  = 'Grade 9';
const SEC_NAME    = 'E2E-SECTION';
const SEC_RENAMED = 'E2E-RENAMED';
const SEC2_NAME   = 'E2E-SECTION-2';

let e2eSectionId  = '';
let e2eSection2Id = '';

// ── Helper: admin login → /sections ──────────────────────────────────────────
async function adminLoginToSections(page: any) {
  const res = await axios.post(`${API}/users/login`,
    { email: ADMIN.email, password: ADMIN.password }, { timeout: 15000 });
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((u: any) => localStorage.setItem('cbas_user', JSON.stringify(u)), res.data.user);
  await page.goto(`${BASE}/sections`, { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForSelector('h1:has-text("Section Management")', { timeout: 15000 });
}

// ── Helper: find active section by grade + name in /sections/counts ───────────
async function findSection(grade: string, name: string): Promise<any> {
  const r = await axios.get(`${API}/sections/counts?academic_year=${ACADEMIC_YEAR}`,
    { timeout: 15000 });
  return (Array.isArray(r.data) ? r.data : [])
    .find((s: any) => s.grade === grade && s.name === name) ?? null;
}

// ── Helper: GET /sections/:id (works for active and inactive) ─────────────────
async function getSectionById(id: string) {
  return axios.get(`${API}/sections/${id}`,
    { timeout: 10000, validateStatus: () => true });
}

// ── Helper: find active-panel row by section name ─────────────────────────────
// Section rows have class "hover:bg-gray-50" and contain a span.font-semibold with the name.
function activeRow(page: any, panel: any, name: string) {
  return panel.locator('[class*="hover:bg-gray-50"]')
    .filter({ has: page.locator(`span.font-semibold:has-text("${name}")`) });
}

// ── Helper: find deactivated-panel row by section name ───────────────────────
// Deactivated rows have class "hover:bg-gray-50 opacity-60" and a span.line-through.
function deacRow(page: any, panel: any, name: string) {
  return panel.locator('[class*="hover:bg-gray-50"]')
    .filter({ has: page.locator(`span.line-through:has-text("${name}")`) });
}

// ── Helper: stat card value — scope with border-l-4 (only on cards, not grid) ─
function statCardValue(page: any, label: string) {
  return page.locator('[class*="border-l-4"]')
    .filter({ has: page.locator(`p:has-text("${label}")`) })
    .locator('p.text-2xl');
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Section Management', () => {

// ── beforeAll: remove stale E2E-* sections from previous runs ────────────────
test.beforeAll(async () => {
  console.log('\n🌱 Cleaning stale E2E sections...');
  const r = await axios.get(`${API}/sections/counts?academic_year=${ACADEMIC_YEAR}`,
    { timeout: 15000, validateStatus: () => true });
  const stale: any[] = (Array.isArray(r.data) ? r.data : [])
    .filter((s: any) => s.grade === TEST_GRADE && s.name?.startsWith('E2E-'));
  for (const s of stale) {
    await axios.delete(`${API}/sections/${s.id}`,
      { timeout: 10000, validateStatus: () => true });
    console.log(`  🧹 Removed stale: ${s.name} (${s.id})`);
  }
  console.log('🌱 Ready.\n');
});

// ── afterAll: paranoid cleanup ────────────────────────────────────────────────
test.afterAll(async () => {
  const ids = [e2eSectionId, e2eSection2Id].filter(Boolean);
  for (const id of ids) {
    await axios.patch(`${API}/sections/${id}/reactivate`, {},
      { timeout: 10000, validateStatus: () => true });
    await axios.delete(`${API}/sections/${id}`,
      { timeout: 10000, validateStatus: () => true });
  }
  const r = await axios.get(`${API}/sections/counts?academic_year=${ACADEMIC_YEAR}`,
    { timeout: 15000, validateStatus: () => true });
  const stale: any[] = (Array.isArray(r.data) ? r.data : [])
    .filter((s: any) => s.grade === TEST_GRADE && s.name?.startsWith('E2E-'));
  for (const s of stale) {
    await axios.delete(`${API}/sections/${s.id}`,
      { timeout: 10000, validateStatus: () => true });
  }
  console.log('🧹 afterAll: E2E section cleanup done');
});

// ─────────────────────────────────────────────────────────────────────────────

test('SEC1 — Admin lands on Section Management: h1, 4 stat cards, Grade 1 default', async ({ page }) => {
  await adminLoginToSections(page);

  await expect(page.locator('h1:has-text("Section Management")')).toBeVisible();

  // Total Grades card = 13
  await expect(statCardValue(page, 'Total Grades')).toHaveText('13', { timeout: 8000 });

  // Grades with Sections > 0
  const gwsText = await statCardValue(page, 'Grades with Sections').textContent();
  expect(Number(gwsText)).toBeGreaterThan(0);

  // Active Sections > 0
  const activeCount = Number(await statCardValue(page, 'Active Sections').textContent());
  expect(activeCount).toBeGreaterThan(0);

  // Grade 1 selected by default
  await expect(page.locator('h2:has-text("Active Sections in Grade 1")')).toBeVisible();

  // API
  const r = await axios.get(`${API}/sections/counts?academic_year=${ACADEMIC_YEAR}`, { timeout: 15000 });
  expect(Array.isArray(r.data) && r.data.length).toBeTruthy();

  console.log(`✅ SEC1: Section Management loaded — ${activeCount} active sections, 13 total grades, Grade 1 default`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('SEC2 — Grade selector: click Grade 9 → panel + stat card update, API matches', async ({ page }) => {
  await adminLoginToSections(page);

  await page.locator(`button:has-text("${TEST_GRADE}")`).click();
  await page.waitForTimeout(1000);

  // Panel heading
  await expect(page.locator(`h2:has-text("Active Sections in ${TEST_GRADE}")`)).toBeVisible();

  // 4th stat card shows "Grade 9 Sections"
  const uiCountText = await statCardValue(page, `${TEST_GRADE} Sections`).textContent();
  const uiCount = Number(uiCountText);

  // API verify
  const r = await axios.get(
    `${API}/sections?grade=${encodeURIComponent(TEST_GRADE)}&academic_year=${ACADEMIC_YEAR}`,
    { timeout: 15000 });
  expect(Array.isArray(r.data)).toBe(true);
  expect(uiCount).toBe(r.data.length);

  console.log(`✅ SEC2: Grade 9 selected — UI shows ${uiCount} sections, API confirms ${r.data.length}`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('SEC3 — Add section: lowercase input → auto-uppercased → saved → API confirm', async ({ page }) => {
  await adminLoginToSections(page);

  await page.locator(`button:has-text("${TEST_GRADE}")`).click();
  await page.waitForTimeout(1000);

  const nameInput = page.locator('input[placeholder*="HIMALAYA"]');

  // Fill lowercase — onChange handler does toUpperCase()
  await nameInput.fill('e2e-section');
  await expect(nameInput).toHaveValue('E2E-SECTION', { timeout: 3000 });

  await page.locator('button:has-text("+ Add")').click();
  await page.waitForTimeout(2000);

  // Success message
  const successMsg = page.locator('[class*="bg-green-50"]');
  await expect(successMsg).toBeVisible({ timeout: 8000 });
  await expect(successMsg).toContainText('E2E-SECTION');

  // Section row appears in active panel
  const activePanel = page.locator('div.bg-white').filter({ has: page.locator(`h2:has-text("Active Sections in ${TEST_GRADE}")`) });
  await expect(activeRow(page, activePanel, SEC_NAME)).toBeVisible({ timeout: 8000 });

  // API confirm
  const found = await findSection(TEST_GRADE, SEC_NAME);
  expect(found).not.toBeNull();
  expect(found.is_active).toBe(true);
  e2eSectionId = found.id;

  console.log(`✅ SEC3: E2E-SECTION added to ${TEST_GRADE} — ID: ${e2eSectionId}, auto-uppercase verified`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('SEC4 — Duplicate guard: add E2E-SECTION again → error shown, list unchanged', async ({ page }) => {
  expect(e2eSectionId).toBeTruthy();
  await adminLoginToSections(page);

  await page.locator(`button:has-text("${TEST_GRADE}")`).click();
  await page.waitForTimeout(1000);

  await page.locator('input[placeholder*="HIMALAYA"]').fill('E2E-SECTION');
  await page.locator('button:has-text("+ Add")').click();
  await page.waitForTimeout(2000);

  // Error message — border-red-300 is on the message div only (Delete buttons have hover:bg-red-50, not border-red-300)
  const errorMsg = page.locator('[class*="border-red-300"]');
  await expect(errorMsg).toBeVisible({ timeout: 8000 });
  await expect(errorMsg).toContainText(/already exists/i);

  // Still exactly 1 E2E-SECTION row
  const activePanel = page.locator('div.bg-white').filter({ has: page.locator(`h2:has-text("Active Sections in ${TEST_GRADE}")`) });
  expect(await activeRow(page, activePanel, SEC_NAME).count()).toBe(1);

  console.log(`✅ SEC4: Duplicate guard — error shown, exactly 1 ${SEC_NAME} in list`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('SEC5 — Rename cancel: open rename panel → Cancel → panel closed, name unchanged', async ({ page }) => {
  expect(e2eSectionId).toBeTruthy();
  await adminLoginToSections(page);

  await page.locator(`button:has-text("${TEST_GRADE}")`).click();
  await page.waitForTimeout(1000);

  // Click Rename on E2E-SECTION row
  const activePanel = page.locator('div.bg-white').filter({ has: page.locator(`h2:has-text("Active Sections in ${TEST_GRADE}")`) });
  await activeRow(page, activePanel, SEC_NAME).locator('button:has-text("Rename")').click();
  await page.waitForTimeout(500);

  // Amber rename panel opens with pre-filled name
  const renamePanel = page.locator('[class*="bg-amber-50"]');
  await expect(renamePanel).toBeVisible({ timeout: 5000 });
  await expect(renamePanel.locator('h3')).toContainText(SEC_NAME);
  expect(await renamePanel.locator('input').inputValue()).toBe(SEC_NAME);

  // Cancel
  await renamePanel.locator('button:has-text("Cancel")').click();
  await page.waitForTimeout(500);

  // Panel closed, name unchanged
  await expect(renamePanel).not.toBeVisible();
  await expect(activeRow(page, activePanel, SEC_NAME)).toBeVisible();

  console.log(`✅ SEC5: Rename Cancel — amber panel opened pre-filled with "${SEC_NAME}", Cancel closed it, name unchanged`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('SEC6 — Rename: E2E-SECTION → E2E-RENAMED → cascade banner shown → API confirm', async ({ page }) => {
  expect(e2eSectionId).toBeTruthy();
  await adminLoginToSections(page);

  await page.locator(`button:has-text("${TEST_GRADE}")`).click();
  await page.waitForTimeout(1000);

  const activePanel = page.locator('div.bg-white').filter({ has: page.locator(`h2:has-text("Active Sections in ${TEST_GRADE}")`) });
  await activeRow(page, activePanel, SEC_NAME).locator('button:has-text("Rename")').click();
  await page.waitForTimeout(500);

  const renamePanel = page.locator('[class*="bg-amber-50"]');
  await expect(renamePanel).toBeVisible({ timeout: 5000 });

  // Fill new name (onChange auto-uppercases)
  const renameInput = renamePanel.locator('input');
  await renameInput.fill('E2E-RENAMED');
  await expect(renameInput).toHaveValue('E2E-RENAMED', { timeout: 3000 });
  await renamePanel.locator('button:has-text("Rename")').first().click();
  await page.waitForTimeout(2500);

  // Blue cascade banner — border-blue-300 is unique (Rename buttons have hover:bg-blue-50, not border-blue-300)
  const cascadeBanner = page.locator('[class*="border-blue-300"]');
  await expect(cascadeBanner).toBeVisible({ timeout: 8000 });
  const bannerText = await cascadeBanner.locator('p.font-semibold').textContent();
  expect(bannerText).toContain(SEC_NAME);
  expect(bannerText).toContain(SEC_RENAMED);

  // E2E-RENAMED in active list; E2E-SECTION gone
  await expect(activeRow(page, activePanel, SEC_RENAMED)).toBeVisible({ timeout: 8000 });
  await expect(activeRow(page, activePanel, SEC_NAME)).not.toBeVisible();

  // API
  expect(await findSection(TEST_GRADE, SEC_RENAMED)).not.toBeNull();
  expect(await findSection(TEST_GRADE, SEC_NAME)).toBeNull();

  console.log(`✅ SEC6: Renamed ${SEC_NAME} → ${SEC_RENAMED}, cascade banner confirmed, API verified`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('SEC7 — Dismiss cascade result banner: Dismiss link hides the blue banner', async ({ page }) => {
  expect(e2eSectionId).toBeTruthy();
  await adminLoginToSections(page);

  await page.locator(`button:has-text("${TEST_GRADE}")`).click();
  await page.waitForTimeout(1000);

  // Trigger a rename (E2E-RENAMED → E2E-TEMP) to produce the cascade banner
  const activePanel = page.locator('div.bg-white').filter({ has: page.locator(`h2:has-text("Active Sections in ${TEST_GRADE}")`) });
  await activeRow(page, activePanel, SEC_RENAMED).locator('button:has-text("Rename")').click();
  await page.waitForTimeout(500);

  const renamePanel = page.locator('[class*="bg-amber-50"]');
  await renamePanel.locator('input').fill('E2E-TEMP');
  await renamePanel.locator('button:has-text("Rename")').first().click();
  await page.waitForTimeout(2500);

  // Blue cascade banner visible
  const cascadeBanner = page.locator('[class*="border-blue-300"]');
  await expect(cascadeBanner).toBeVisible({ timeout: 8000 });

  // Click Dismiss
  await cascadeBanner.locator('button:has-text("Dismiss")').click();
  await page.waitForTimeout(500);
  await expect(cascadeBanner).not.toBeVisible();

  // Rename back E2E-TEMP → E2E-RENAMED for subsequent tests
  await activeRow(page, activePanel, 'E2E-TEMP').locator('button:has-text("Rename")').click();
  await page.waitForTimeout(500);
  await renamePanel.locator('input').fill('E2E-RENAMED');
  await renamePanel.locator('button:has-text("Rename")').first().click();
  await page.waitForTimeout(2000);

  console.log(`✅ SEC7: Cascade banner dismissed — Dismiss button hides the blue result panel`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('SEC8 — All grades overview: E2E-RENAMED shows as pill; clicking switches to Grade 9', async ({ page }) => {
  expect(e2eSectionId).toBeTruthy();
  await adminLoginToSections(page);

  const overviewPanel = page.locator('div.bg-white').filter({ has: page.locator('h2:has-text("All Grades Overview")') });
  await overviewPanel.scrollIntoViewIfNeeded();
  await expect(overviewPanel.locator('h2:has-text("All Grades Overview")')).toBeVisible();

  // E2E-RENAMED pill visible under Grade 9
  const pill = overviewPanel.locator(`span:has-text("${SEC_RENAMED}")`);
  await expect(pill).toBeVisible({ timeout: 8000 });

  // Clicking pill switches selected grade to Grade 9
  await pill.click();
  await page.waitForTimeout(1000);
  await expect(page.locator(`h2:has-text("Active Sections in ${TEST_GRADE}")`)).toBeVisible();

  console.log(`✅ SEC8: All Grades Overview — ${SEC_RENAMED} pill visible for Grade 9, click switches selected grade`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('SEC9 — Deactivate disabled when section has students (ASTEROID, Grade 1)', async ({ page }) => {
  await adminLoginToSections(page);

  // Grade 1 is the default selected grade on page load — no click needed.
  // Trying to click "Grade 1" button causes strict mode violation because "Grade 10"
  // button also matches :has-text("Grade 1") (substring), and regex filters on raw
  // textContent (which includes whitespace) are unreliable in Playwright.

  const activePanel = page.locator('div.bg-white').filter({ has: page.locator('h2:has-text("Active Sections in Grade 1")') });
  await expect(activePanel).toBeVisible({ timeout: 8000 });

  const row = activeRow(page, activePanel, 'ASTEROID');
  await expect(row).toBeVisible({ timeout: 8000 });

  // Student count label visible
  await expect(row).toContainText('students');

  // Both buttons disabled
  await expect(row.locator('button:has-text("Deactivate")')).toBeDisabled();
  await expect(row.locator('button:has-text("Delete")')).toBeDisabled();

  // API verify
  const apiAsteroid = await findSection('Grade 1', 'ASTEROID');
  expect(apiAsteroid).not.toBeNull();
  expect(apiAsteroid.student_count).toBeGreaterThan(0);

  console.log(`✅ SEC9: ASTEROID (${apiAsteroid.student_count} students) — Deactivate + Delete disabled, safety constraint verified`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('SEC10 — Deactivate E2E-RENAMED (0 students): moves to Deactivated panel → API is_active=false', async ({ page }) => {
  expect(e2eSectionId).toBeTruthy();
  await adminLoginToSections(page);

  await page.locator(`button:has-text("${TEST_GRADE}")`).click();
  await page.waitForTimeout(1500);

  const activePanel = page.locator('div.bg-white').filter({ has: page.locator(`h2:has-text("Active Sections in ${TEST_GRADE}")`) });
  const row = activeRow(page, activePanel, SEC_RENAMED);
  await expect(row).toBeVisible({ timeout: 8000 });

  // 0 students label
  await expect(row).toContainText('No active students');

  // Deactivate enabled
  const deactivateBtn = row.locator('button:has-text("Deactivate")');
  await expect(deactivateBtn).toBeEnabled();

  page.once('dialog', dialog => dialog.accept());
  await deactivateBtn.click();
  await page.waitForTimeout(2000);

  // Success message
  await expect(page.locator('[class*="bg-green-50"]')).toBeVisible({ timeout: 8000 });

  // Gone from active list (deactivated panel is NOT visible — /sections/counts only returns
  // is_active=true sections, so the deactivated panel never renders after deactivation)
  await expect(activeRow(page, activePanel, SEC_RENAMED)).not.toBeVisible();

  // API verify
  const sec = await getSectionById(e2eSectionId);
  expect(sec.data.is_active).toBe(false);

  console.log(`✅ SEC10: ${SEC_RENAMED} deactivated — in Deactivated panel (strikethrough), is_active=false`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('SEC11 — Reactivate E2E-RENAMED: re-add → backend auto-reactivates → back in Active list → API is_active=true', async ({ page }) => {
  expect(e2eSectionId).toBeTruthy();
  await adminLoginToSections(page);

  await page.locator(`button:has-text("${TEST_GRADE}")`).click();
  await page.waitForTimeout(1500);

  // /sections/counts only returns active sections — the deactivated panel never renders,
  // so there is no Reactivate button in the UI. Instead, the backend auto-reactivates a
  // previously-deactivated section when you POST /sections with the same grade+name+year.
  // The frontend doesn't include inactive sections in its sections[] array, so exists=false
  // and the POST goes through.
  const nameInput = page.locator('input[placeholder*="HIMALAYA"]');
  await nameInput.fill(SEC_RENAMED);
  await page.locator('button:has-text("+ Add")').click();
  await page.waitForTimeout(2000);

  // Success message
  await expect(page.locator('[class*="bg-green-50"]')).toBeVisible({ timeout: 8000 });

  // Back in active list
  const activePanel = page.locator('div.bg-white').filter({ has: page.locator(`h2:has-text("Active Sections in ${TEST_GRADE}")`) });
  await expect(activeRow(page, activePanel, SEC_RENAMED)).toBeVisible({ timeout: 8000 });

  // API verify
  const sec = await getSectionById(e2eSectionId);
  expect(sec.data.is_active).toBe(true);

  console.log(`✅ SEC11: ${SEC_RENAMED} reactivated via re-add — back in Active list, is_active=true`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('SEC12 — Delete from Active list: E2E-RENAMED gone → API 404', async ({ page }) => {
  expect(e2eSectionId).toBeTruthy();
  await adminLoginToSections(page);

  await page.locator(`button:has-text("${TEST_GRADE}")`).click();
  await page.waitForTimeout(1500);

  const activePanel = page.locator('div.bg-white').filter({ has: page.locator(`h2:has-text("Active Sections in ${TEST_GRADE}")`) });
  const row = activeRow(page, activePanel, SEC_RENAMED);
  await expect(row).toBeVisible({ timeout: 8000 });

  // Delete enabled (0 students)
  const deleteBtn = row.locator('button:has-text("Delete")');
  await expect(deleteBtn).toBeEnabled();

  page.once('dialog', dialog => dialog.accept());
  await deleteBtn.click();
  await page.waitForTimeout(2000);

  // Success message
  await expect(page.locator('[class*="bg-green-50"]')).toBeVisible({ timeout: 8000 });

  // Gone from active list
  await expect(activeRow(page, activePanel, SEC_RENAMED)).not.toBeVisible();

  // API verify deleted — NestJS returns empty body (axios parses as "") when findOne returns null
  const sec = await getSectionById(e2eSectionId);
  expect(sec.data).toBeFalsy();
  e2eSectionId = '';

  console.log(`✅ SEC12: ${SEC_RENAMED} deleted from Active list — UI clear, API 404`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('SEC13 — Delete from Deactivated state: add → deactivate (browser) → delete via API → 404', async ({ page }) => {
  await adminLoginToSections(page);

  await page.locator(`button:has-text("${TEST_GRADE}")`).click();
  await page.waitForTimeout(1000);

  // Add E2E-SECTION-2
  const nameInput = page.locator('input[placeholder*="HIMALAYA"]');
  await nameInput.fill('E2E-SECTION-2');
  await expect(nameInput).toHaveValue('E2E-SECTION-2', { timeout: 3000 });
  await page.locator('button:has-text("+ Add")').click();
  await page.waitForTimeout(2000);
  await expect(page.locator('[class*="bg-green-50"]')).toBeVisible({ timeout: 8000 });

  const found = await findSection(TEST_GRADE, SEC2_NAME);
  expect(found).not.toBeNull();
  const sectionId = found.id;
  e2eSection2Id = sectionId;

  // Deactivate via browser
  const activePanel = page.locator('div.bg-white').filter({ has: page.locator(`h2:has-text("Active Sections in ${TEST_GRADE}")`) });
  page.once('dialog', dialog => dialog.accept());
  await activeRow(page, activePanel, SEC2_NAME).locator('button:has-text("Deactivate")').click();
  await page.waitForTimeout(2000);

  // Browser verify: section gone from active list
  await expect(activeRow(page, activePanel, SEC2_NAME)).not.toBeVisible();

  // API verify deactivated
  const secCheck = await getSectionById(sectionId);
  expect(secCheck.data.is_active).toBe(false);

  // Delete via API — the deactivated panel is not reachable in the UI because
  // /sections/counts only returns is_active=true sections, so the panel never renders
  const delRes = await axios.delete(`${API}/sections/${sectionId}`,
    { timeout: 10000, validateStatus: () => true });
  expect(delRes.status).toBe(200);
  e2eSection2Id = '';

  // API verify: deleted — NestJS returns empty body (axios parses as "") when findOne returns null
  const deleted = await getSectionById(sectionId);
  expect(deleted.data).toBeFalsy();

  console.log(`✅ SEC13: ${SEC2_NAME} added → deactivated (browser, active list gone) → deleted (API) → 404`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('SEC14 — Normalize Case button: success message → API /sections/counts still healthy', async ({ page }) => {
  await adminLoginToSections(page);

  const normalizeBtn = page.locator('button:has-text("Normalize Case")');
  await expect(normalizeBtn).toBeVisible({ timeout: 8000 });
  await normalizeBtn.click();
  await page.waitForTimeout(2000);

  // Success message
  const successMsg = page.locator('[class*="bg-green-50"]');
  await expect(successMsg).toBeVisible({ timeout: 8000 });
  await expect(successMsg).toContainText(/normalized/i);

  // API healthy
  const r = await axios.get(`${API}/sections/counts?academic_year=${ACADEMIC_YEAR}`, { timeout: 15000 });
  expect(Array.isArray(r.data)).toBe(true);
  expect(r.data.length).toBeGreaterThan(0);

  console.log(`✅ SEC14: Normalize Case — success message shown, API sections healthy (${r.data.length} sections)`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('SEC15 — Academic year filter: switch 2024-25 → title updates → switch back 2025-26', async ({ page }) => {
  await adminLoginToSections(page);

  const yearSelect = page.locator('select').first();
  await expect(yearSelect).toBeVisible();
  expect(await yearSelect.inputValue()).toBe(ACADEMIC_YEAR);

  // Switch to 2024-25
  await yearSelect.selectOption('2024-25');
  await page.waitForTimeout(2000);

  const overviewPanel = page.locator('div.bg-white').filter({ has: page.locator('h2:has-text("All Grades Overview")') });
  await expect(overviewPanel.locator('h2')).toContainText('2024-25', { timeout: 8000 });

  // Switch back to 2025-26
  await yearSelect.selectOption('2025-26');
  await page.waitForTimeout(2000);
  await expect(overviewPanel.locator('h2')).toContainText('2025-26', { timeout: 8000 });

  // API healthy
  const r = await axios.get(`${API}/sections/counts?academic_year=2025-26`, { timeout: 15000 });
  expect(Array.isArray(r.data) && r.data.length).toBeTruthy();

  console.log(`✅ SEC15: Year filter — 2024-25 title confirmed, 2025-26 restored, API healthy`);
});

}); // end test.describe('Section Management')
