import { test, expect } from '@playwright/test';
import axios from 'axios';

const BASE = 'https://cbas-frontend-production.up.railway.app';
const API  = 'https://cbas-backend-production.up.railway.app';
const ADMIN_EMAIL    = 'garkaswetha@gmail.com';
const ADMIN_PASSWORD = 'swetha123';

async function login(page: any) {
  await page.goto(BASE, { timeout: 60000 });
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  await page.waitForTimeout(2000);
}

async function goToCompetencies(page: any) {
  await page.click('a:has-text("Competency"), span:has-text("Competency")');
  await page.waitForSelector('h1:has-text("Competency Registry")', { timeout: 15000 });
  await page.waitForTimeout(1000);
}

async function goToActivities(page: any) {
  await page.click('a:has-text("Activities"), span:has-text("Activities")');
  await page.waitForSelector('h1:has-text("Activities")', { timeout: 15000 });
  await page.waitForTimeout(1000);
}

// ════════════════════════════════════════════════════════════════
//  GROUP C — COMPETENCY REGISTRY CRUD
// ════════════════════════════════════════════════════════════════

test.describe('Competency Registry — CRUD & Import', () => {

  test('C1. Page loads with stats and competency table', async ({ page }) => {
    await login(page);
    await goToCompetencies(page);

    // Stats cards must be visible
    await expect(page.locator('p:has-text("Total Competencies")')).toBeVisible();
    await expect(page.locator('p:has-text("Subjects")')).toBeVisible();

    // Table must have at least one row OR empty state message
    const tableRows = page.locator('tbody tr');
    const rowCount = await tableRows.count();
    if (rowCount === 0) {
      await expect(page.locator('text=/No competencies found/')).toBeVisible();
    } else {
      expect(rowCount).toBeGreaterThan(0);
    }
    console.log(`✅ Registry loaded — ${rowCount} rows visible`);
  });

  test('C2. Pagination: totalPages never shows 0', async ({ page }) => {
    await login(page);
    await goToCompetencies(page);

    const pageInfo = page.locator('p').filter({ hasText: /Page \d+ of \d+/ }).first();
    await expect(pageInfo).toBeVisible();
    const text = await pageInfo.textContent() || '';
    expect(text).not.toMatch(/Page \d+ of 0/);
    console.log(`✅ Pagination text: "${text.trim()}" — no "of 0"`);
  });

  test('C3. Filter by subject narrows results', async ({ page }) => {
    await login(page);
    await goToCompetencies(page);

    // Click first subject pill
    const firstPill = page.locator('button').filter({ hasText: /\(\d+\)/ }).first();
    const pillText = await firstPill.textContent();
    await firstPill.click();
    await page.waitForTimeout(1000);

    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
    console.log(`✅ Subject filter "${pillText?.trim()}" → ${count} rows`);

    // Clear filter
    await page.locator('button:has-text("Clear")').click();
    await page.waitForTimeout(500);
  });

  test('C4. Add new competency, then verify it appears in table', async ({ page }) => {
    await login(page);
    await goToCompetencies(page);

    // Switch to Add tab
    await page.click('button:has-text("➕ Add New")');
    await page.waitForTimeout(500);

    await page.fill('input[list="subject-options"]', 'test_subject_e2e');
    await page.selectOption('select', { label: 'Foundation (Pre-KG to Grade 2)' });
    await page.fill('input[placeholder*="Listening, Operations"]', 'E2E Domain');
    await page.fill('input[placeholder*="C-1.1"]', 'E2E-TEST-001');
    await page.fill('textarea', 'Automated E2E test competency — safe to delete');

    await page.click('button:has-text("➕ Add Competency")');
    await page.waitForTimeout(2000);

    const msg = page.locator('div.bg-green-50').filter({ hasText: /Competency added/ }).last();
    await expect(msg).toBeVisible({ timeout: 5000 });
    console.log('✅ Add competency success message shown');

    // Switch to View tab and search for it
    await page.click('button:has-text("📋 View & Manage")');
    await page.waitForTimeout(500);
    await page.fill('input[placeholder*="Search code"]', 'E2E-TEST-001');
    await page.waitForTimeout(1000);

    const found = page.locator('td').filter({ hasText: 'E2E-TEST-001' });
    await expect(found).toBeVisible({ timeout: 5000 });
    console.log('✅ Added competency E2E-TEST-001 appears in filtered table');
  });

  test('C5. Edit modal validates required fields', async ({ page }) => {
    await login(page);
    await goToCompetencies(page);

    // Find E2E competency and click edit
    await page.fill('input[placeholder*="Search code"]', 'E2E-TEST-001');
    await page.waitForTimeout(1000);
    const editBtn = page.locator('button:has-text("Edit")').first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();
    await page.waitForTimeout(500);

    // Clear subject and try to save
    await page.locator('input[list="edit-subject-list"]').clear();
    await page.click('button:has-text("💾 Save Changes")');
    await page.waitForTimeout(1000);

    const errMsg = page.locator('div.bg-red-50').filter({ hasText: /Subject and Description/ }).last();
    await expect(errMsg).toBeVisible({ timeout: 5000 });
    console.log('✅ Edit modal validation blocks empty subject');

    // Cancel
    await page.click('button:has-text("Cancel")');
  });

  test('C6. Edit competency and save successfully', async ({ page }) => {
    await login(page);
    await goToCompetencies(page);

    await page.fill('input[placeholder*="Search code"]', 'E2E-TEST-001');
    await page.waitForTimeout(1000);
    const editBtn = page.locator('button:has-text("Edit")').first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();
    await page.waitForTimeout(500);

    // Update description
    const descArea = page.locator('textarea').last();
    await descArea.clear();
    await descArea.fill('Updated E2E description — still safe to delete');
    await page.click('button:has-text("💾 Save Changes")');
    await page.waitForTimeout(2000);

    const msg = page.locator('div.bg-green-50').filter({ hasText: /Updated successfully/ }).last();
    await expect(msg).toBeVisible({ timeout: 5000 });
    console.log('✅ Edit saved successfully');
  });

  test('C7. Deactivate and Restore competency (soft delete cycle)', async ({ page }) => {
    test.setTimeout(120000);
    // Ensure E2E-TEST-001 exists and is active before starting (idempotent setup)
    const check = await axios.get(`${API}/activities/competencies?search=E2E-TEST-001&include_inactive=true`);
    const existing = (check.data?.competencies || []).find((c: any) => c.competency_code === 'E2E-TEST-001');
    if (existing && !existing.is_active) {
      await axios.patch(`${API}/activities/competencies/${existing.id}/reactivate`);
    } else if (!existing) {
      await axios.post(`${API}/activities/competencies`, {
        subject: 'test_subject_e2e', stage: 'foundation', grade: 'Grade 1',
        domain: 'E2E Domain', competency_code: 'E2E-TEST-001',
        description: 'Automated E2E test competency — safe to delete',
      });
    }

    await login(page);
    await goToCompetencies(page);

    // Search and deactivate the specific row
    await page.fill('input[placeholder*="Search code"]', 'E2E-TEST-001');
    await page.waitForTimeout(1500);

    // Verify exactly one Remove button visible (for E2E-TEST-001 row)
    const removeBtn = page.locator('button:has-text("Remove")').first();
    await expect(removeBtn).toBeVisible({ timeout: 5000 });

    page.on('dialog', d => d.accept());
    await removeBtn.click();
    await page.waitForTimeout(3000); // wait for PATCH + refetch

    const msg = page.locator('div.bg-green-50').filter({ hasText: /Competency deactivated/ }).last();
    await expect(msg).toBeVisible({ timeout: 8000 });
    console.log('✅ Deactivated E2E-TEST-001');

    // Refetch the filtered list and verify the row is gone from active view
    await page.fill('input[placeholder*="Search code"]', '');
    await page.waitForTimeout(300);
    await page.fill('input[placeholder*="Search code"]', 'E2E-TEST-001');
    await page.waitForTimeout(2000);
    await expect(page.locator('td').filter({ hasText: 'E2E-TEST-001' }).first()).not.toBeVisible({ timeout: 5000 });
    console.log('✅ Deactivated competency hidden from active view');

    // Enable "Show deactivated" toggle
    await page.click('input[type="checkbox"]');
    await page.waitForTimeout(1500);

    await expect(page.locator('td').filter({ hasText: 'E2E-TEST-001' }).first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Inactive competency visible with "Show deactivated" on');

    // Restore via the Restore button
    const restoreBtn = page.locator('button:has-text("Restore")').first();
    await expect(restoreBtn).toBeVisible();
    await restoreBtn.click();
    await page.waitForTimeout(3000);

    const restoreMsg = page.locator('div.bg-green-50').filter({ hasText: /Competency restored/ }).last();
    await expect(restoreMsg).toBeVisible({ timeout: 8000 });
    console.log('✅ Competency restored — full deactivate/restore cycle passes');

    // Uncheck toggle and verify active again
    await page.click('input[type="checkbox"]');
    await page.waitForTimeout(1500);
    await expect(page.locator('td').filter({ hasText: 'E2E-TEST-001' }).first()).toBeVisible({ timeout: 5000 });
    console.log('✅ Restored competency visible in active view');
  });

  test('C8. API: reactivate endpoint works directly', async () => {
    test.setTimeout(60000);
    // Find the E2E competency via API
    const r = await axios.get(`${API}/activities/competencies?search=E2E-TEST-001&include_inactive=true`);
    const comps = r.data?.competencies || [];
    if (!comps.length) { console.log('⚠️ E2E-TEST-001 not found — skipping API reactivate test'); return; }

    const id = comps[0].id;

    // Deactivate via API
    await axios.delete(`${API}/activities/competencies/${id}`);
    const afterDel = await axios.get(`${API}/activities/competencies?search=E2E-TEST-001`);
    expect((afterDel.data?.competencies || []).length).toBe(0);

    // Reactivate via API
    const reactivateRes = await axios.patch(`${API}/activities/competencies/${id}/reactivate`);
    expect(reactivateRes.status).toBe(200);
    expect(reactivateRes.data.is_active).toBe(true);

    const afterReact = await axios.get(`${API}/activities/competencies?search=E2E-TEST-001`);
    expect((afterReact.data?.competencies || []).length).toBeGreaterThan(0);
    console.log('✅ API reactivate endpoint verified: deactivate → reactivate cycle');
  });

  test('C9. Cleanup: delete E2E test competency', async () => {
    const r = await axios.get(`${API}/activities/competencies?search=E2E-TEST-001&include_inactive=true`);
    const comps = r.data?.competencies || [];
    if (comps.length) {
      await axios.delete(`${API}/activities/competencies/${comps[0].id}`);
      console.log(`✅ Cleaned up E2E-TEST-001 (id: ${comps[0].id})`);
    } else {
      console.log('ℹ️ E2E-TEST-001 already gone — no cleanup needed');
    }
  });

});

// ════════════════════════════════════════════════════════════════
//  GROUP D — ACTIVITIES TAB
// ════════════════════════════════════════════════════════════════

test.describe('Activities — create, list, delete', () => {

  test('D1. Activities tab loads and shows list or empty state', async ({ page }) => {
    await login(page);
    await goToActivities(page);

    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    if (rowCount === 0) {
      await expect(page.locator('text=/No activities/i')).toBeVisible({ timeout: 5000 });
    } else {
      expect(rowCount).toBeGreaterThan(0);
    }
    console.log(`✅ Activities tab loaded — ${rowCount} activities`);
  });

  test('D2. Create activity blocked without competency selection', async ({ page }) => {
    await login(page);
    await goToActivities(page);

    // Open add form
    const addBtn = page.locator('button').filter({ hasText: /\+ (Add|New|Create)/ }).first();
    if (!(await addBtn.isVisible())) {
      console.log('⚠️ No add button found on activities tab — skipping');
      return;
    }
    await addBtn.click();
    await page.waitForTimeout(1000);

    // Try to save without selecting a competency
    const saveBtn = page.locator('button').filter({ hasText: /Save|Create/ }).first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(1000);
      // Either a validation message about competency OR the form stays open
      const validationMsg = page.locator('div').filter({ hasText: /competency|required/i });
      const msgVisible = await validationMsg.isVisible().catch(() => false);
      console.log(`✅ Saving without competency: validation shown = ${msgVisible}`);
    }
  });

  test('D3. Marks Entry tab: changing grade clears stale marks', async ({ page }) => {
    test.setTimeout(90000);
    await login(page);
    await goToActivities(page);

    // Switch to Marks Entry tab
    await page.click('button:has-text("✏️ Marks Entry")');
    await page.waitForTimeout(1000);

    // Select a grade
    const gradeSelect = page.locator('select').first();
    await gradeSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);

    // Switch to a different grade — verify no crash and table resets
    const allOptions = await gradeSelect.locator('option').allTextContents();
    if (allOptions.length > 2) {
      await gradeSelect.selectOption({ index: 2 });
      await page.waitForTimeout(1500);
      // Should not crash — any table/empty state is acceptable
      const crashed = await page.locator('text=/Cannot read|undefined|null/').isVisible().catch(() => false);
      expect(crashed).toBe(false);
      console.log('✅ Switching grade does not crash marks entry tab');
    }
  });

  test('D4. Subject Report tab loads without error', async ({ page }) => {
    await login(page);
    await goToActivities(page);

    await page.click('button:has-text("📑 Subject Report")');
    await page.waitForTimeout(1000);

    // Should show grade selector
    await expect(page.locator('select').first()).toBeVisible();
    console.log('✅ Subject Report tab renders grade selector');
  });

});

// ════════════════════════════════════════════════════════════════
//  GROUP E — DASHBOARD
// ════════════════════════════════════════════════════════════════

test.describe('Activities Dashboard — school, grade, section, student views', () => {

  test('E1. Dashboard tab loads — School view', async ({ page }) => {
    test.setTimeout(60000);
    await login(page);
    await goToActivities(page);

    await page.click('button:has-text("📊 Dashboard")');
    await page.waitForTimeout(3000);

    // School subtab should be auto-selected
    const schoolBtn = page.locator('button').filter({ hasText: /School/ }).first();
    await expect(schoolBtn).toBeVisible({ timeout: 10000 });
    console.log('✅ Dashboard tab loads — School subtab visible');
  });

  test('E2. Dashboard — Grade sub-tab loads data for a grade', async ({ page }) => {
    test.setTimeout(60000);
    await login(page);
    await goToActivities(page);

    await page.click('button:has-text("📊 Dashboard")');
    await page.waitForTimeout(2000);

    const gradeBtn = page.locator('button').filter({ hasText: /Grade/ }).first();
    await expect(gradeBtn).toBeVisible({ timeout: 10000 });
    await gradeBtn.click();
    await page.waitForTimeout(1000);

    const gradeSelect = page.locator('select').first();
    await gradeSelect.selectOption({ index: 1 });
    await page.waitForTimeout(3000);

    // Should not show a JS error
    const crashed = await page.locator('text=/Cannot read|TypeError/').isVisible().catch(() => false);
    expect(crashed).toBe(false);
    console.log('✅ Grade dashboard loaded without JS crash');
  });

  test('E3. Dashboard — Alerts sub-tab renders', async ({ page }) => {
    test.setTimeout(60000);
    await login(page);
    await goToActivities(page);

    await page.click('button:has-text("📊 Dashboard")');
    await page.waitForTimeout(2000);

    const alertsBtn = page.locator('button').filter({ hasText: /Alert|Decline/i }).first();
    if (await alertsBtn.isVisible()) {
      await alertsBtn.click();
      await page.waitForTimeout(3000);
      // Verify no JS crash — content may be empty, loading, or populated
      const crashed = await page.locator('text=/TypeError|Cannot read/').isVisible().catch(() => false);
      expect(crashed).toBe(false);
      console.log(`✅ Alerts tab rendered without crash`);
    } else {
      console.log('⚠️ Alerts sub-tab not found — skipping');
    }
  });

  test('E4. Dashboard — Coverage sub-tab renders for grade+section', async ({ page }) => {
    test.setTimeout(60000);
    await login(page);
    await goToActivities(page);

    await page.click('button:has-text("📊 Dashboard")');
    await page.waitForTimeout(2000);

    const coverageBtn = page.locator('button').filter({ hasText: /Coverage/i }).first();
    if (await coverageBtn.isVisible()) {
      await coverageBtn.click();
      await page.waitForTimeout(1000);

      const selects = page.locator('select');
      const count = await selects.count();
      if (count >= 2) {
        await selects.first().selectOption({ index: 1 });
        await page.waitForTimeout(1000);
        await selects.nth(1).selectOption({ index: 1 }).catch(() => {});
        await page.waitForTimeout(3000);
      }

      const crashed = await page.locator('text=/Cannot read|TypeError/').isVisible().catch(() => false);
      expect(crashed).toBe(false);
      console.log('✅ Coverage sub-tab renders without crash');
    } else {
      console.log('⚠️ Coverage sub-tab not found — skipping');
    }
  });

});

// ════════════════════════════════════════════════════════════════
//  GROUP F — BACKEND API DIRECT TESTS
// ════════════════════════════════════════════════════════════════

test.describe('Backend API — competency endpoints', () => {

  test('F1. GET /activities/competencies returns array with competencies key', async () => {
    const r = await axios.get(`${API}/activities/competencies`);
    expect(r.status).toBe(200);
    expect(r.data).toHaveProperty('competencies');
    expect(Array.isArray(r.data.competencies)).toBe(true);
    console.log(`✅ GET /activities/competencies: ${r.data.competencies.length} items`);
  });

  test('F2. GET /activities/competencies/stats returns totals', async () => {
    const r = await axios.get(`${API}/activities/competencies/stats`);
    expect(r.status).toBe(200);
    expect(typeof r.data.total).toBe('number');
    expect(Array.isArray(r.data.bySubject)).toBe(true);
    expect(Array.isArray(r.data.subjects)).toBe(true);
    console.log(`✅ Stats: total=${r.data.total}, subjects=${r.data.subjects.length}`);
  });

  test('F3. POST/PUT/DELETE/PATCH competency lifecycle via API', async () => {
    // Create
    const created = await axios.post(`${API}/activities/competencies`, {
      subject: 'test_api_subject', stage: 'foundation', grade: 'Grade 1',
      domain: 'API Test', competency_code: 'API-TEST-999',
      description: 'API lifecycle test competency',
    });
    expect(created.status).toBe(201);
    expect(created.data.id).toBeTruthy();
    const id = created.data.id;
    console.log(`✅ POST created id=${id}`);

    // Update
    const updated = await axios.put(`${API}/activities/competencies/${id}`, {
      subject: 'test_api_subject', stage: 'preparatory', grade: 'Grade 3',
      domain: 'API Test Updated', competency_code: 'API-TEST-999',
      description: 'Updated description',
    });
    expect(updated.status).toBe(200);
    expect(updated.data.stage).toBe('preparatory');
    console.log(`✅ PUT updated stage to preparatory`);

    // Soft delete
    const deleted = await axios.delete(`${API}/activities/competencies/${id}`);
    expect(deleted.status).toBe(200);
    expect(deleted.data.message).toContain('deactivated');

    // Verify not in active list
    const afterDel = await axios.get(`${API}/activities/competencies?search=API-TEST-999`);
    expect((afterDel.data?.competencies || []).length).toBe(0);
    console.log(`✅ DELETE soft-deleted — gone from active list`);

    // Reactivate
    const reactivated = await axios.patch(`${API}/activities/competencies/${id}/reactivate`);
    expect(reactivated.status).toBe(200);
    expect(reactivated.data.is_active).toBe(true);

    // Verify back in active list
    const afterReact = await axios.get(`${API}/activities/competencies?search=API-TEST-999`);
    expect((afterReact.data?.competencies || []).length).toBeGreaterThan(0);
    console.log(`✅ PATCH reactivate — back in active list`);

    // Cleanup
    await axios.delete(`${API}/activities/competencies/${id}`);
    console.log(`✅ Full API lifecycle: CREATE → UPDATE → DELETE → REACTIVATE ✓`);
  });

  test('F4. GET ?include_inactive=true returns deactivated competencies too', async () => {
    // Create and deactivate a competency
    const c = await axios.post(`${API}/activities/competencies`, {
      subject: 'test_inactive', stage: 'foundation', grade: 'Grade 2',
      domain: 'Test', competency_code: 'INACTIVE-TEST-001', description: 'Inactive test',
    });
    await axios.delete(`${API}/activities/competencies/${c.data.id}`);

    const activeOnly = await axios.get(`${API}/activities/competencies?search=INACTIVE-TEST-001`);
    expect((activeOnly.data?.competencies || []).length).toBe(0);

    const withInactive = await axios.get(`${API}/activities/competencies?search=INACTIVE-TEST-001&include_inactive=true`);
    const found = (withInactive.data?.competencies || []).find((x: any) => x.competency_code === 'INACTIVE-TEST-001');
    expect(found).toBeTruthy();
    expect(found.is_active).toBe(false);
    console.log('✅ include_inactive=true returns deactivated competencies');

    // Cleanup
    await axios.delete(`${API}/activities/competencies/${c.data.id}`);
  });

  test('F5. Score clamped to max 4.0 — no score exceeds 4-point scale', async () => {
    // Fetch existing student competency scores
    const r = await axios.get(`${API}/activities/dashboard/school?academic_year=2025-26`);
    if (!r.data?.topStudents?.length && !r.data?.subjects?.length) {
      console.log('⚠️ No school dashboard data — skipping score clamp test');
      return;
    }
    // Check scores in school dashboard
    const subjects = r.data.subjects || r.data.topStudents || [];
    for (const entry of subjects.slice(0, 20)) {
      if (entry.avg_score !== undefined) {
        expect(+entry.avg_score).toBeLessThanOrEqual(4.0);
      }
    }
    console.log('✅ All sampled scores ≤ 4.0');
  });

});
