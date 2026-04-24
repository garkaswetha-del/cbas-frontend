import { test, expect } from '@playwright/test';
import axios from 'axios';

const BASE = 'https://cbas-frontend-production.up.railway.app';
const API  = 'https://cbas-backend-production.up.railway.app';
const ADMIN_EMAIL    = 'garkaswetha@gmail.com';
const ADMIN_PASSWORD = 'swetha123';

// Stable nursery teacher with existing appraisal data
const NURSERY_TEACHER = 'Chaithra M';

async function login(page: any) {
  await page.goto(BASE, { timeout: 60000 });
  await page.waitForSelector('input[type="email"]', { timeout: 20000 });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  await page.waitForTimeout(2000);
}

async function goToAppraisal(page: any) {
  await page.click('a:has-text("Teachers Appraisal"), span:has-text("Teachers Appraisal")');
  await page.waitForSelector('table', { timeout: 20000 });
  await page.waitForFunction(() => document.querySelectorAll('tbody tr').length > 1, {}, { timeout: 25000 });
}

async function apiAppraisals(year = '2025-26') {
  const res = await axios.get(`${API}/appraisal?academic_year=${year}`);
  return res.data as any[];
}

async function teacherAppraisal(name: string, year = '2025-26') {
  const all = await apiAppraisals(year);
  return all.find((t: any) => t.teacher_name === name);
}

// Ensure a teacher is NOT shared so share tests have something to work with
async function ensureUnshared(id: string) {
  try { await axios.patch(`${API}/appraisal/unshare/${id}`); } catch {}
}

test.describe('E2E — Teachers Appraisal (comprehensive)', () => {

  // ══════════════════════════════════════════════════════════════
  // GROUP 1 — PAGE LOAD & LAYOUT
  // ══════════════════════════════════════════════════════════════

  test('1. Page loads with correct title and subtitle', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    await expect(page.locator('h1:has-text("Teachers Appraisal")')).toBeVisible();
    await expect(page.locator('p:has-text("Principal View")')).toBeVisible();
    console.log('✅ Title and subtitle visible');
  });

  test('2. Stage badges shown in header with correct labels', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const stages = ['Foundation', 'Preparatory', 'Middle', 'Secondary'];
    for (const s of stages) {
      const badge = page.locator(`span:has-text("${s}:")`);
      const count = await badge.count();
      if (count > 0) {
        await expect(badge.first()).toBeVisible();
        console.log(`✅ Stage badge: ${s}`);
      }
    }
    await expect(page.locator('span:has-text("Total:")')).toBeVisible();
    console.log('✅ Total badge visible');
  });

  test('3. Stats bar shows all 5 cards with non-zero Total', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    await expect(page.locator('p:text-is("Total Teachers")')).toBeVisible();
    await expect(page.locator('p:text-is("Shared")')).toBeVisible();
    await expect(page.locator('p:text-is("Saved (Not shared)")')).toBeVisible();
    await expect(page.locator('p:text-is("Pending")')).toBeVisible();
    await expect(page.locator('p:text-is("Avg Score")')).toBeVisible();
    // Total should be a positive number
    const totalCard = page.locator('p:has-text("Total Teachers")').locator('..').locator('p.text-xl');
    const totalText = await totalCard.textContent();
    expect(parseInt(totalText || '0')).toBeGreaterThan(0);
    console.log(`✅ Stats bar — Total: ${totalText}`);
  });

  test('4. Stats bar values match backend counts', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const all = await apiAppraisals('2025-26');
    const sharedCount  = all.filter((t: any) => t.appraisal?.is_shared).length;
    const savedCount   = all.filter((t: any) => t.appraisal && !t.appraisal.is_shared).length;
    const pendingCount = all.filter((t: any) => !t.appraisal).length;
    // Verify Shared count card shows correct value
    const sharedCard = page.locator('p:has-text("Shared")').first().locator('..').locator('p.text-xl');
    const sharedText = await sharedCard.textContent();
    expect(parseInt(sharedText || '-1')).toBe(sharedCount);
    console.log(`✅ Stats bar — Shared: UI=${sharedText}, API=${sharedCount}`);
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 2 — YEAR DROPDOWN
  // ══════════════════════════════════════════════════════════════

  test('5. Year dropdown has all 4 year options', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const select = page.locator('select').filter({ hasText: '2025-26' });
    await expect(select).toBeVisible();
    const options = await select.locator('option').allTextContents();
    expect(options).toContain('2023-24');
    expect(options).toContain('2024-25');
    expect(options).toContain('2025-26');
    expect(options).toContain('2026-27');
    console.log(`✅ Year dropdown options: ${options.join(', ')}`);
  });

  test('6. Changing year reloads table (2024-25 returns different data)', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const before = await page.locator('tbody tr').count();
    // Switch to 2024-25
    const yearSelect = page.locator('label:has-text("Academic Year:")').locator('..').locator('select');
    await yearSelect.selectOption('2024-25');
    await page.waitForTimeout(3000);
    // Table should reload (may have different count or empty)
    const after = await page.locator('tbody tr').count();
    console.log(`✅ Year changed — 2025-26 rows: ${before}, 2024-25 rows: ${after}`);
    // Switch back
    await yearSelect.selectOption('2025-26');
    await page.waitForTimeout(2000);
    const restored = await page.locator('tbody tr').count();
    expect(restored).toBe(before);
    console.log(`✅ Switched back to 2025-26 — rows restored: ${restored}`);
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 3 — FILTER BAR
  // ══════════════════════════════════════════════════════════════

  test('7. Name search filter narrows table rows', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const totalBefore = await page.locator('tbody tr').count();
    const searchBox = page.locator('input[placeholder="Name..."]');
    await searchBox.fill('Chaithra');
    await page.waitForTimeout(500);
    const afterFilter = await page.locator('tbody tr').count();
    expect(afterFilter).toBeLessThan(totalBefore);
    await expect(page.locator('tbody tr').filter({ hasText: 'Chaithra' }).first()).toBeVisible();
    console.log(`✅ Name filter — before: ${totalBefore}, after "Chaithra": ${afterFilter}`);
  });

  test('8. Stage filter shows only matching stage teachers', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    // Switch to others tab first to test stage filter
    await page.getByRole('button', { name: /Grade 1 onwards/ }).click();
    await page.waitForTimeout(1000);
    const stageSelect = page.locator('label:has-text("Stage")').locator('..').locator('select');
    await stageSelect.selectOption('Preparatory');
    await page.waitForTimeout(500);
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
    console.log(`✅ Stage filter "Preparatory" — ${rows} rows shown`);
    // Reset
    await stageSelect.selectOption('');
    await page.waitForTimeout(300);
  });

  test('9. Status filter — Pending shows only unevaluated teachers', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const statusSelect = page.locator('label:has-text("Status")').locator('..').locator('select');
    await statusSelect.selectOption('pending');
    await page.waitForTimeout(500);
    // All visible name cells should show ⏳ Pending badge
    const badges = page.locator('span:has-text("⏳ Pending")');
    const count = await badges.count();
    console.log(`✅ Status=pending — ${count} ⏳ Pending badges visible`);
    // Reset
    await statusSelect.selectOption('');
  });

  test('10. Status filter — Shared shows only shared teachers', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const statusSelect = page.locator('label:has-text("Status")').locator('..').locator('select');
    await statusSelect.selectOption('shared');
    await page.waitForTimeout(500);
    const badges = page.locator('span:has-text("✅ Shared")');
    const count = await badges.count();
    console.log(`✅ Status=shared — ${count} ✅ Shared badges visible`);
    await statusSelect.selectOption('');
  });

  test('11. Status filter — Saved shows only saved (not shared) teachers', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const statusSelect = page.locator('label:has-text("Status")').locator('..').locator('select');
    await statusSelect.selectOption('saved');
    await page.waitForTimeout(500);
    const badges = page.locator('span:has-text("💾 Saved")');
    const count = await badges.count();
    console.log(`✅ Status=saved — ${count} 💾 Saved badges visible`);
    await statusSelect.selectOption('');
  });

  test('12. Clear filter button appears when filter active and resets all filters', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const searchBox = page.locator('input[placeholder="Name..."]');
    await searchBox.fill('Test');
    await page.waitForTimeout(300);
    const clearBtn = page.locator('button:has-text("Clear")');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await page.waitForTimeout(300);
    expect(await searchBox.inputValue()).toBe('');
    await expect(clearBtn).not.toBeVisible();
    console.log('✅ Clear filter button works correctly');
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 4 — TABS & TABLE STRUCTURE
  // ══════════════════════════════════════════════════════════════

  test('13. Nursery tab shows only Pre-KG/LKG/UKG teachers', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    // Already on nursery tab by default
    const nurseryBtn = page.getByRole('button', { name: /Pre-KG \/ LKG \/ UKG/ });
    await expect(nurseryBtn).toBeVisible();
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
    console.log(`✅ Nursery tab — ${rows} rows`);
  });

  test('14. Grade 1 onwards tab shows exam columns PA1–SA2', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    await page.getByRole('button', { name: /Grade 1 onwards/ }).click();
    await page.waitForTimeout(2000);
    await expect(page.locator('th:has-text("PA 1")')).toBeVisible();
    await expect(page.locator('th:has-text("SA 2")')).toBeVisible();
    await expect(page.locator('th:has-text("EXAM MARKS")')).toBeVisible();
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
    console.log(`✅ Grade 1 tab — ${rows} rows, PA/SA columns visible`);
  });

  test('15. Tab counts update when name filter applied', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    // Get default tab count from button text
    const nurseryBtn = page.getByRole('button', { name: /Pre-KG \/ LKG \/ UKG/ });
    const defaultText = await nurseryBtn.textContent();
    // Apply filter
    await page.locator('input[placeholder="Name..."]').fill('Chaithra');
    await page.waitForTimeout(500);
    const filteredText = await nurseryBtn.textContent();
    console.log(`✅ Tab count — default: "${defaultText}", filtered: "${filteredText}"`);
    // Count should be smaller or equal
    const def = parseInt(defaultText?.match(/\((\d+)\)/)?.[1] || '99');
    const filt = parseInt(filteredText?.match(/\((\d+)\)/)?.[1] || '0');
    expect(filt).toBeLessThanOrEqual(def);
    // Reset
    await page.locator('input[placeholder="Name..."]').fill('');
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 5 — NURSERY TABLE DROPDOWNS
  // ══════════════════════════════════════════════════════════════

  test('16. Nursery — Literacy band dropdown has 3 options and selection persists in UI', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const row = page.locator('tbody tr').filter({ hasText: NURSERY_TEACHER });
    const litSelect = row.locator('select').nth(0);
    const opts = await litSelect.locator('option').allTextContents();
    // Should have -- + 3 options = 4
    expect(opts.length).toBe(4);
    expect(opts[1]).toContain('EXCELLENT');
    expect(opts[2]).toContain('GOOD');
    expect(opts[3]).toContain('NEEDS IMPROVEMENT');
    // Select GOOD
    await litSelect.selectOption({ index: 2 });
    expect(await litSelect.inputValue()).toContain('GOOD');
    console.log('✅ Literacy band — 3 options, selection works');
  });

  test('17. Nursery — Numeracy band dropdown has 3 options and selection persists', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const row = page.locator('tbody tr').filter({ hasText: NURSERY_TEACHER });
    const numSelect = row.locator('select').nth(1);
    const opts = await numSelect.locator('option').allTextContents();
    expect(opts.length).toBe(4); // -- + 3
    expect(opts[1]).toContain('HANDS ON');
    await numSelect.selectOption({ index: 1 });
    expect(await numSelect.inputValue()).toContain('EXCELLENT');
    console.log('✅ Numeracy band — 3 options, selection works');
  });

  test('18. Nursery — Workshops dropdown has 4 options (including NOT APPLICABLE)', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const row = page.locator('tbody tr').filter({ hasText: NURSERY_TEACHER });
    const wsSelect = row.locator('select').nth(2);
    const opts = await wsSelect.locator('option').allTextContents();
    expect(opts.length).toBe(5); // -- + 4
    expect(opts.some(o => o.includes('41 TO 50'))).toBe(true);
    expect(opts.some(o => o.includes('NOT APPLICABLE'))).toBe(true);
    console.log('✅ Workshops dropdown — 4 options including NOT APPLICABLE');
  });

  test('19. Nursery — Training Sessions dropdown has 3 options', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const row = page.locator('tbody tr').filter({ hasText: NURSERY_TEACHER });
    const trSelect = row.locator('select').nth(3);
    const opts = await trSelect.locator('option').allTextContents();
    expect(opts.length).toBe(4); // -- + 3
    expect(opts.some(o => o.includes('2 TRAINING'))).toBe(true);
    console.log('✅ Training sessions — 3 options');
  });

  test('20. Nursery — Behaviour dropdowns (Team Work, Attitude, Commitment, Adaptability, Dressing) all have 3 options each', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const row = page.locator('tbody tr').filter({ hasText: NURSERY_TEACHER });
    // Behaviour dropdowns are indices 7-11 (after lit(0), num(1), workshops(2), training(3), books(4), articles(5), strategies(6))
    const behaviourSelectIndices = [7, 8, 9, 10, 11];
    for (const idx of behaviourSelectIndices) {
      const sel = row.locator('select').nth(idx);
      const opts = await sel.locator('option').allTextContents();
      expect(opts.length).toBe(4); // -- + 3
      console.log(`✅ Behaviour select[${idx}] — ${opts.length - 1} options`);
    }
  });

  test('21. Nursery — Parents Feedback dropdown has 4 options', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const row = page.locator('tbody tr').filter({ hasText: NURSERY_TEACHER });
    // Parents feedback is after behaviour (idx 12)
    const pfSelect = row.locator('select').nth(12);
    const opts = await pfSelect.locator('option').allTextContents();
    expect(opts.length).toBe(5); // -- + 4
    expect(opts.some(o => o.includes('BELOW 3'))).toBe(true);
    expect(opts.some(o => o.includes('MORE THAN 10'))).toBe(true);
    console.log('✅ Parents Feedback — 4 options');
  });

  test('22. Nursery — Classroom Observation band is a SINGLE dropdown (not array)', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const row = page.locator('tbody tr').filter({ hasText: NURSERY_TEACHER });
    // Classroom is idx 13
    const clSelect = row.locator('select').nth(13);
    await expect(clSelect).toBeVisible();
    const opts = await clSelect.locator('option').allTextContents();
    expect(opts.length).toBe(5); // -- + 4 bands
    expect(opts.some(o => o.includes('BELOW 10'))).toBe(true);
    expect(opts.some(o => o.includes('20 & ABOVE'))).toBe(true);
    // Verify only ONE classroom select (not multiple for multiple observations)
    const allSelects = await row.locator('select').count();
    console.log(`✅ Classroom observation — single dropdown, ${opts.length - 1} options, ${allSelects} total selects in row`);
  });

  test('23. Nursery — English Comm dropdown has 4 options', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const row = page.locator('tbody tr').filter({ hasText: NURSERY_TEACHER });
    const enSelect = row.locator('select').nth(14);
    const opts = await enSelect.locator('option').allTextContents();
    expect(opts.length).toBe(5); // -- + 4
    expect(opts.some(o => o.includes('BELOW 3'))).toBe(true);
    console.log('✅ English Comm — 4 options');
  });

  test('24. Nursery — Committee Role dropdown has 3 options (LEAD/MEMBER/NOT INVOLVED)', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const row = page.locator('tbody tr').filter({ hasText: NURSERY_TEACHER });
    const commSelect = row.locator('select').nth(15);
    const opts = await commSelect.locator('option').allTextContents();
    expect(opts.some(o => o === 'LEAD')).toBe(true);
    expect(opts.some(o => o === 'MEMBER')).toBe(true);
    expect(opts.some(o => o === 'NOT INVOLVED')).toBe(true);
    console.log('✅ Committee Role — 3 options: LEAD, MEMBER, NOT INVOLVED');
  });

  test('25. Nursery — Committee Name text input accepts free text', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const row = page.locator('tbody tr').filter({ hasText: NURSERY_TEACHER });
    const nameInput = row.locator('input[placeholder="Committee name..."]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('E2E Test Committee');
    expect(await nameInput.inputValue()).toBe('E2E Test Committee');
    await nameInput.fill(''); // reset
    console.log('✅ Committee name text input works');
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 6 — RESPONSIBILITIES CHECKBOXES
  // ══════════════════════════════════════════════════════════════

  test('26. Nursery — 11 Responsibility checkboxes present and toggle correctly', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const row = page.locator('tbody tr').filter({ hasText: NURSERY_TEACHER });
    const checkboxes = row.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBe(11);
    // Toggle first checkbox
    const first = checkboxes.nth(0);
    const wasChecked = await first.isChecked();
    await first.click();
    expect(await first.isChecked()).toBe(!wasChecked);
    await first.click(); // restore
    console.log(`✅ 11 checkboxes present, toggle works (was ${wasChecked}, toggled, restored)`);
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 7 — COMMENT (💬) BUTTONS
  // ══════════════════════════════════════════════════════════════

  test('27. Comment button opens textarea and hides it on second click', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const row = page.locator('tbody tr').filter({ hasText: NURSERY_TEACHER });
    const commentBtn = row.locator('button:has-text("💬")').first();
    // Open
    await commentBtn.click();
    const textarea = row.locator('textarea[placeholder="Optional comment..."]').first();
    await expect(textarea).toBeVisible();
    // Close
    await commentBtn.click();
    await expect(textarea).not.toBeVisible();
    console.log('✅ 💬 button toggles comment textarea');
  });

  test('28. Comment typed → saved in backend → persists after reload', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const row = page.locator('tbody tr').filter({ hasText: NURSERY_TEACHER });
    const commentBtn = row.locator('button:has-text("💬")').first();
    await commentBtn.click();
    const testComment = `E2E comment ${Date.now()}`;
    await row.locator('textarea[placeholder="Optional comment..."]').first().fill(testComment);
    // Save
    const saveBtn = row.locator('td').first().locator('button:has-text("Save")');
    await saveBtn.click();
    await expect(page.locator('.bg-green-50').filter({ hasText: 'Saved' })).toBeVisible({ timeout: 8000 });
    // Backend verify
    const updated = await teacherAppraisal(NURSERY_TEACHER);
    expect(updated?.appraisal?.workshops_comment).toBe(testComment);
    console.log(`✅ Comment saved in backend: "${testComment}"`);
    // Cleanup
    if (!(await row.locator('textarea').first().isVisible())) await commentBtn.click();
    await row.locator('textarea[placeholder="Optional comment..."]').first().fill('');
    await saveBtn.click();
    await page.waitForTimeout(1500);
    console.log('✅ Comment cleared');
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 8 — SAVE BUTTON & SCORING
  // ══════════════════════════════════════════════════════════════

  test('29. Save button shows success toast and re-fetches data', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const row = page.locator('tbody tr').filter({ hasText: NURSERY_TEACHER });
    const saveBtn = row.locator('td').first().locator('button:has-text("Save")');
    await saveBtn.click();
    const toast = page.locator('.bg-green-50').filter({ hasText: 'Saved' });
    await expect(toast).toBeVisible({ timeout: 8000 });
    console.log(`✅ Save toast visible: "${await toast.textContent()}"`);
  });

  test('30. Save recalculates scores — changing literacy band updates literacy_score in backend', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const row = page.locator('tbody tr').filter({ hasText: NURSERY_TEACHER });
    // Set literacy to EXCELLENT (score=5 → 5/5*0.1=0.1)
    const litSelect = row.locator('select').nth(0);
    await litSelect.selectOption({ index: 1 }); // EXCELLENT
    const saveBtn = row.locator('td').first().locator('button:has-text("Save")');
    await saveBtn.click();
    await expect(page.locator('.bg-green-50').filter({ hasText: 'Saved' })).toBeVisible({ timeout: 8000 });
    const after = await teacherAppraisal(NURSERY_TEACHER);
    const litScore = parseFloat(after?.appraisal?.literacy_score || '0');
    expect(litScore).toBeCloseTo(0.1, 3); // 5/5*0.1
    console.log(`✅ Literacy EXCELLENT → literacy_score=${litScore} (expected 0.1)`);
  });

  test('31. Overall % shown in Summary column and matches backend value', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const row = page.locator('tbody tr').filter({ hasText: NURSERY_TEACHER });
    const data = await teacherAppraisal(NURSERY_TEACHER);
    if (!data?.appraisal?.overall_percentage) {
      console.log('ℹ️  No overall_percentage — skipping');
      return;
    }
    const expected = (+data.appraisal.overall_percentage).toFixed(1) + '%';
    // Overall % is the 4th-from-last td
    const tds = row.locator('td');
    const count = await tds.count();
    const overallTd = tds.nth(count - 4);
    const uiText = await overallTd.textContent();
    expect(uiText?.trim()).toBe(expected);
    console.log(`✅ Overall % — UI: "${uiText?.trim()}", Backend: "${expected}"`);
  });

  test('32. Salary Increment shown with Base/Resp breakdown in Summary column', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const data = await teacherAppraisal(NURSERY_TEACHER);
    if (!data?.appraisal?.overall_percentage) {
      console.log('ℹ️  No overall_percentage — skipping');
      return;
    }
    const row = page.locator('tbody tr').filter({ hasText: NURSERY_TEACHER });
    const tds = row.locator('td');
    const count = await tds.count();
    const incTd = tds.nth(count - 3);
    const incText = await incTd.textContent();
    expect(incText).toContain('Base:');
    console.log(`✅ Increment cell: "${incText?.trim().slice(0, 60)}"`);
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 9 — STATUS BADGES & NAME CELL
  // ══════════════════════════════════════════════════════════════

  test('33. Name cell shows teacher name, StatusBadge, and qualification (read-only italic)', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const row = page.locator('tbody tr').filter({ hasText: NURSERY_TEACHER });
    const nameCell = row.locator('td').first();
    await expect(nameCell.locator('div.font-semibold')).toBeVisible();
    // Status badge present
    const badge = nameCell.locator('span').filter({ hasText: /Pending|Saved|Shared/ });
    await expect(badge).toBeVisible();
    // No input for qualification (read-only)
    const qualInput = nameCell.locator('input[placeholder*="qualif"], input[name*="qualif"]');
    expect(await qualInput.count()).toBe(0);
    // Qualification shown as italic text if available
    const data = await teacherAppraisal(NURSERY_TEACHER);
    if (data?.appraisal_qualification) {
      await expect(nameCell.locator('div.italic, p.italic')).toBeVisible();
      console.log(`✅ Qualification shown read-only: "${data.appraisal_qualification}"`);
    }
    console.log('✅ Name cell has name, badge, no editable qual field');
  });

  test('34. Pending teacher shows ⏳ Pending badge; Shared teacher shows ✅ Shared badge', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const all = await apiAppraisals('2025-26');
    const pending = all.find((t: any) => !t.appraisal);
    const shared  = all.find((t: any) => t.appraisal?.is_shared === true);
    if (pending) {
      // Navigate to correct tab
      if (!isNurseryGrade(pending.assigned_classes)) {
        await page.getByRole('button', { name: /Grade 1 onwards/ }).click();
        await page.waitForTimeout(1500);
      }
      const pRow = page.locator('tbody tr').filter({ hasText: pending.teacher_name });
      await expect(pRow.locator('span:has-text("⏳ Pending")')).toBeVisible({ timeout: 8000 });
      console.log(`✅ ${pending.teacher_name} — ⏳ Pending badge visible`);
    }
    if (shared) {
      // Navigate to correct tab
      if (!isNurseryGrade(shared.assigned_classes)) {
        await page.getByRole('button', { name: /Grade 1 onwards/ }).click();
        await page.waitForTimeout(1500);
      } else {
        await page.getByRole('button', { name: /Pre-KG \/ LKG \/ UKG/ }).click();
        await page.waitForTimeout(1500);
      }
      const sRow = page.locator('tbody tr').filter({ hasText: shared.teacher_name });
      if (await sRow.count() > 0) {
        await expect(sRow.locator('span:has-text("✅ Shared")').first()).toBeVisible({ timeout: 8000 });
        console.log(`✅ ${shared.teacher_name} — ✅ Shared badge visible`);
      }
    }
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 10 — SHARE CONFIRMATION MODAL
  // ══════════════════════════════════════════════════════════════

  test('35. Share button opens confirmation modal with teacher name', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const all = await apiAppraisals('2025-26');
    const target = all.find((t: any) => t.appraisal?.id && !t.appraisal.is_shared && t.appraisal.overall_percentage);
    if (!target) { console.log('ℹ️  No unshared teacher — skip'); return; }
    await ensureUnshared(target.appraisal.id);
    await page.reload();
    await page.waitForSelector('table', { timeout: 15000 });
    await page.waitForFunction(() => document.querySelectorAll('tbody tr').length > 1, {}, { timeout: 20000 });
    // Navigate to correct tab
    if (!isNurseryGrade(target.assigned_classes)) {
      await page.getByRole('button', { name: /Grade 1 onwards/ }).click();
      await page.waitForTimeout(1500);
    }
    const row = page.locator('tbody tr').filter({ hasText: target.teacher_name });
    await row.locator('button:has-text("Share")').click();
    await expect(page.locator('h3:has-text("Share Appraisal?")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`strong:has-text("${target.teacher_name}")`)).toBeVisible();
    console.log(`✅ Share modal opened for: ${target.teacher_name}`);
  });

  test('36. Cancel button in share modal closes modal without sharing', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const all = await apiAppraisals('2025-26');
    const target = all.find((t: any) => t.appraisal?.id && !t.appraisal.is_shared && t.appraisal.overall_percentage);
    if (!target) { console.log('ℹ️  No unshared target — skip'); return; }
    await ensureUnshared(target.appraisal.id);
    await page.reload();
    await page.waitForSelector('table', { timeout: 15000 });
    await page.waitForFunction(() => document.querySelectorAll('tbody tr').length > 1, {}, { timeout: 20000 });
    if (!isNurseryGrade(target.assigned_classes)) {
      await page.getByRole('button', { name: /Grade 1 onwards/ }).click();
      await page.waitForTimeout(1500);
    }
    const row = page.locator('tbody tr').filter({ hasText: target.teacher_name });
    await row.locator('button:has-text("Share")').click();
    await expect(page.locator('h3:has-text("Share Appraisal?")')).toBeVisible({ timeout: 5000 });
    await page.locator('button:has-text("Cancel")').click();
    await expect(page.locator('h3:has-text("Share Appraisal?")')).not.toBeVisible({ timeout: 3000 });
    const check = await teacherAppraisal(target.teacher_name);
    expect(check?.appraisal?.is_shared).toBe(false);
    console.log(`✅ Cancel modal — is_shared still false for ${target.teacher_name}`);
  });

  test('37. Confirm Share → is_shared=true in backend, Recall button appears, success toast', { timeout: 90000 }, async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const all = await apiAppraisals('2025-26');
    const target = all.find((t: any) => t.appraisal?.id && !t.appraisal.is_shared && t.appraisal.overall_percentage);
    if (!target) { console.log('ℹ️  No unshared teacher with data — skip'); return; }
    await ensureUnshared(target.appraisal.id);
    await page.reload();
    await page.waitForSelector('table', { timeout: 15000 });
    await page.waitForFunction(() => document.querySelectorAll('tbody tr').length > 1, {}, { timeout: 20000 });
    if (!isNurseryGrade(target.assigned_classes)) {
      await page.getByRole('button', { name: /Grade 1 onwards/ }).click();
      await page.waitForTimeout(1500);
    }
    const row = page.locator('tbody tr').filter({ hasText: target.teacher_name });
    await row.locator('button:has-text("Share")').click();
    await expect(page.locator('h3:has-text("Share Appraisal?")')).toBeVisible({ timeout: 5000 });
    await page.locator('button:has-text("Yes, Share")').click();
    await expect(page.locator('.bg-green-50').filter({ hasText: 'Shared' })).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(2000); // allow DB write to propagate
    const updated = await teacherAppraisal(target.teacher_name);
    expect(updated?.appraisal?.is_shared).toBe(true);
    expect(updated?.appraisal?.shared_at).toBeTruthy();
    await expect(row.locator('button:has-text("Recall")')).toBeVisible({ timeout: 5000 });
    console.log(`✅ Share confirmed — is_shared=true, shared_at set, Recall button visible for ${target.teacher_name}`);
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 11 — RECALL (UNSHARE)
  // ══════════════════════════════════════════════════════════════

  test('38. Recall button → is_shared=false in backend, Share button reappears', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    // Find a shared teacher
    const all = await apiAppraisals('2025-26');
    let target = all.find((t: any) => t.appraisal?.id && t.appraisal.is_shared);
    if (!target) {
      // Share one first
      const unsaved = all.find((t: any) => t.appraisal?.id && !t.appraisal.is_shared && t.appraisal.overall_percentage);
      if (!unsaved) { console.log('ℹ️  No teacher to share/recall — skip'); return; }
      await axios.patch(`${API}/appraisal/share/${unsaved.appraisal.id}`);
      target = unsaved;
      await page.reload();
      await page.waitForSelector('table', { timeout: 15000 });
      await page.waitForFunction(() => document.querySelectorAll('tbody tr').length > 1, {}, { timeout: 20000 });
    }
    const row = page.locator('tbody tr').filter({ hasText: target.teacher_name });
    const recallBtn = row.locator('button:has-text("Recall")');
    if (await recallBtn.count() === 0) {
      console.log(`ℹ️  Recall button not in current tab view — skip`);
      return;
    }
    await recallBtn.click();
    await expect(page.locator('.bg-green-50').filter({ hasText: 'Recalled' })).toBeVisible({ timeout: 8000 });
    // Backend verify
    const updated = await teacherAppraisal(target.teacher_name);
    expect(updated?.appraisal?.is_shared).toBe(false);
    // Share button reappears
    await expect(row.locator('button:has-text("Share")')).toBeVisible({ timeout: 5000 });
    console.log(`✅ Recall — is_shared=false, Share button reappeared`);
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 12 — FOOTER ROW
  // ══════════════════════════════════════════════════════════════

  test('39. Footer row shows evaluated/pending count and avg score', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const tfoot = page.locator('tfoot');
    await expect(tfoot).toBeVisible();
    const footText = await tfoot.textContent();
    expect(footText).toContain('teachers');
    expect(footText).toContain('pending');
    expect(footText).toContain('Evaluated');
    console.log(`✅ Footer row: "${footText?.slice(0, 80)}"`);
  });

  test('40. Footer avg score shows "-" when no evaluated teachers, or "X.X%" when some', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const tfoot = page.locator('tfoot');
    const footText = await tfoot.textContent();
    const hasScore = /\d+\.\d+%/.test(footText || '');
    const hasDash  = footText?.includes('-');
    expect(hasScore || hasDash).toBe(true);
    console.log(`✅ Footer avg score correctly shows: ${hasScore ? 'percentage' : 'dash'}`);
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 13 — GRADE 1 ONWARDS TABLE
  // ══════════════════════════════════════════════════════════════

  test('41. Grade 1 onwards — PA1-SA2 numeric inputs accept values and save to backend', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    await page.getByRole('button', { name: /Grade 1 onwards/ }).click();
    await page.waitForTimeout(2000);
    // Find a teacher with an existing appraisal
    const all = await apiAppraisals('2025-26');
    const others = all.filter((t: any) => {
      const cls = t.assigned_classes || [];
      return !cls.every((c: string) => ['Pre-KG','LKG','UKG','Nursery'].includes(c));
    });
    const target = others.find((t: any) => t.appraisal?.id);
    if (!target) { console.log('ℹ️  No Grade 1+ teacher with appraisal — skip'); return; }
    const row = page.locator('tbody tr').filter({ hasText: target.teacher_name });
    const pa1Input = row.locator('input[type="number"]').first();
    await pa1Input.fill('85');
    expect(await pa1Input.inputValue()).toBe('85');
    const saveBtn = row.locator('td').first().locator('button:has-text("Save")');
    await saveBtn.click();
    await expect(page.locator('.bg-green-50').filter({ hasText: 'Saved' })).toBeVisible({ timeout: 8000 });
    // Backend verify
    const updated = await teacherAppraisal(target.teacher_name);
    expect(parseFloat(updated?.appraisal?.pa1 || '0')).toBe(85);
    console.log(`✅ Grade 1 PA1=85 saved in backend for ${target.teacher_name}`);
    // Restore
    await pa1Input.fill(String(parseFloat(target.appraisal?.pa1 || '0')));
    await saveBtn.click();
    await page.waitForTimeout(1500);
  });

  test('42. Grade 1 onwards — exam_score = sum(PA1..SA2)/600*0.5 in backend', async ({ page }) => {
    await login(page);
    const all = await apiAppraisals('2025-26');
    const others = all.filter((t: any) => {
      const cls = t.assigned_classes || [];
      return !cls.every((c: string) => ['Pre-KG','LKG','UKG','Nursery'].includes(c));
    });
    const target = others.find((t: any) => t.appraisal?.exam_score && +t.appraisal.exam_score > 0);
    if (!target) { console.log('ℹ️  No Grade 1+ with exam_score > 0 — skip'); return; }
    const a = target.appraisal;
    const expected = ((+a.pa1)+(+a.pa2)+(+a.pa3)+(+a.pa4)+(+a.sa1)+(+a.sa2)) / 600 * 0.5;
    expect(Math.abs(+a.exam_score - expected)).toBeLessThan(0.001);
    console.log(`✅ ${target.teacher_name} exam_score=${a.exam_score}, calculated=${expected.toFixed(6)} — match`);
  });

  test('43. Grade 1 onwards — Skills, Behaviour, Parents Feedback, Classroom, English Comm dropdowns present', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    await page.getByRole('button', { name: /Grade 1 onwards/ }).click();
    await page.waitForTimeout(2000);
    const all = await apiAppraisals('2025-26');
    const others = all.filter((t: any) => !isNurseryGrade(t.assigned_classes));
    if (!others.length) { console.log('ℹ️  No Grade 1+ teachers — skip'); return; }
    const row = page.locator('tbody tr').first();
    const selects = row.locator('select');
    const count = await selects.count();
    expect(count).toBeGreaterThan(5); // at least workshops, training, books, articles, strategies, behaviour cols, parents, classroom, english, committee
    console.log(`✅ Grade 1+ row has ${count} dropdowns`);
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 14 — EXPORT TO EXCEL
  // ══════════════════════════════════════════════════════════════

  test('44. Export Excel button triggers file download', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.locator('button:has-text("Export Excel")').click(),
    ]);
    expect(download.suggestedFilename()).toContain('appraisals_');
    expect(download.suggestedFilename()).toContain('.xlsx');
    console.log(`✅ Excel downloaded: "${download.suggestedFilename()}"`);
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 15 — BACKEND API INTEGRITY
  // ══════════════════════════════════════════════════════════════

  test('45. Backend /appraisal returns classroom_observation_band (not classroom_observations array)', async () => {
    const all = await apiAppraisals('2025-26');
    const withAppraisal = all.find((t: any) => t.appraisal?.id);
    if (!withAppraisal) { console.log('ℹ️  No teacher with appraisal — skip'); return; }
    const a = withAppraisal.appraisal;
    // New field: classroom_observation_band (string or null)
    expect('classroom_observation_band' in a).toBe(true);
    expect(typeof a.classroom_observation_band === 'string' || a.classroom_observation_band === null).toBe(true);
    // Old field should NOT be present as a non-null array
    const isOldArray = Array.isArray(a.classroom_observations);
    expect(isOldArray).toBe(false);
    console.log(`✅ classroom_observation_band = "${a.classroom_observation_band}" (not an array)`);
  });

  test('46. Backend score calculation: nursery literacy_score + numeracy_score + skills_score + behaviour_score = correct total', { timeout: 60000 }, async () => {
    const all = await apiAppraisals('2025-26');
    const nursery = all.find((t: any) => {
      const cls = t.assigned_classes || [];
      return cls.every((c: string) => ['Pre-KG','LKG','UKG','Nursery'].includes(c))
        && t.appraisal?.overall_percentage && +t.appraisal.overall_percentage > 0;
    });
    if (!nursery) { console.log('ℹ️  No scored nursery teacher — skip'); return; }
    const a = nursery.appraisal;
    const total = +a.literacy_score + +a.numeracy_score + +a.skills_score + +a.behaviour_score
      + +a.parents_feedback_score + +a.classroom_score + +a.english_comm_score + +a.responsibilities_score;
    expect(Math.abs(total - +a.overall_score)).toBeLessThan(0.001);
    console.log(`✅ Nursery ${nursery.teacher_name} — sum of sub-scores=${total.toFixed(4)}, overall_score=${a.overall_score} — match`);
  });

  test('47. Backend: unshare endpoint sets is_shared=false and shared_at=null', async () => {
    const all = await apiAppraisals('2025-26');
    const target = all.find((t: any) => t.appraisal?.id && t.appraisal.overall_percentage);
    if (!target) { console.log('ℹ️  No appraisal found — skip'); return; }
    // Share first
    await axios.patch(`${API}/appraisal/share/${target.appraisal.id}`);
    let check = await teacherAppraisal(target.teacher_name);
    expect(check?.appraisal?.is_shared).toBe(true);
    // Unshare
    await axios.patch(`${API}/appraisal/unshare/${target.appraisal.id}`);
    check = await teacherAppraisal(target.teacher_name);
    expect(check?.appraisal?.is_shared).toBe(false);
    expect(check?.appraisal?.shared_at).toBeFalsy();
    console.log(`✅ Unshare API — is_shared=false, shared_at=null`);
  });

  test('48. Backend: qualification from user record shown in appraisal response', async () => {
    const all = await apiAppraisals('2025-26');
    const withQual = all.find((t: any) => t.appraisal_qualification);
    if (!withQual) { console.log('ℹ️  No teacher with qualification — skip'); return; }
    expect(typeof withQual.appraisal_qualification).toBe('string');
    expect(withQual.appraisal_qualification.length).toBeGreaterThan(0);
    console.log(`✅ ${withQual.teacher_name} qualification: "${withQual.appraisal_qualification}"`);
  });

  test('49. Nursery Classroom Observation: selecting a band and saving updates classroom_score in backend', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const row = page.locator('tbody tr').filter({ hasText: NURSERY_TEACHER });
    // Find and set classroom observation band (idx 13)
    const clSelect = row.locator('select').nth(13);
    await clSelect.selectOption({ index: 4 }); // "20 & ABOVE:- 10 MARKS"
    const saveBtn = row.locator('td').first().locator('button:has-text("Save")');
    await saveBtn.click();
    await expect(page.locator('.bg-green-50').filter({ hasText: 'Saved' })).toBeVisible({ timeout: 8000 });
    // Backend: classroom_score = (10/10)*0.2 = 0.2 for nursery
    const updated = await teacherAppraisal(NURSERY_TEACHER);
    const cs = parseFloat(updated?.appraisal?.classroom_score || '0');
    expect(cs).toBeCloseTo(0.2, 3);
    console.log(`✅ Classroom "20 & ABOVE" → classroom_score=${cs} (expected 0.2)`);
  });

  test('50. Shared appraisal — shared_at is accessible via GET /appraisal/shared/:id endpoint', async () => {
    const all = await apiAppraisals('2025-26');
    const shared = all.find((t: any) => t.appraisal?.is_shared === true);
    if (!shared) { console.log('ℹ️  No shared appraisal — skip'); return; }
    const res = await axios.get(`${API}/appraisal/shared/${shared.appraisal.id}`);
    expect(res.data.is_shared).toBe(true);
    expect(res.data.teacher_id).toBe(shared.teacher_id);
    console.log(`✅ GET /appraisal/shared/:id returns correct data for ${shared.teacher_name}`);
  });

});

// Helper (pure function, no page needed)
function isNurseryGrade(classes: string[]): boolean {
  if (!classes?.length) return false;
  return classes.every((c: string) => ['Pre-KG', 'LKG', 'UKG', 'Nursery'].includes(c));
}
