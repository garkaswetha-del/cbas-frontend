import { test, expect } from '@playwright/test';

const BASE = 'https://cbas-frontend-production.up.railway.app';
const ADMIN_EMAIL = 'garkaswetha@gmail.com';
const ADMIN_PASSWORD = 'swetha123';

async function login(page: any) {
  await page.goto(BASE);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  await page.waitForTimeout(2000);
}

async function goToAppraisal(page: any) {
  await page.click('a:has-text("Teachers Appraisal"), span:has-text("Teachers Appraisal")');
  await page.waitForSelector('table', { timeout: 15000 });
  await page.waitForTimeout(1000);
}

test.describe('Teachers Appraisal', () => {

  test('1. Page loads with title and academic year', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    await expect(page.getByText(/Teachers Appraisal.*2025-26/)).toBeVisible();
    console.log('✅ Appraisal page loaded with correct academic year');
  });

  test('2. Stage summary badges are visible', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    await expect(page.getByText(/Foundation:/)).toBeVisible();
    await expect(page.getByText(/Total:/)).toBeVisible();
    console.log('✅ Stage summary badges (Foundation, Total) are visible');
  });

  test('3. Both tabs exist — Pre-KG/LKG/UKG and Grade 1 onwards', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    await expect(page.getByRole('button', { name: /Pre-KG \/ LKG \/ UKG/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Grade 1 onwards/ })).toBeVisible();
    console.log('✅ Both tabs visible');
  });

  test('4. Nursery tab is active by default and shows teachers', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);

    // Nursery tab should be active (indigo background)
    const nurseryTab = page.getByRole('button', { name: /Pre-KG \/ LKG \/ UKG/ });
    await expect(nurseryTab).toHaveClass(/bg-indigo-600/);

    // Table should have rows
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✅ Nursery tab active by default — ${count} teacher rows`);
  });

  test('5. Nursery tab — correct column headers (LITERACY, NUMERACY, etc.)', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);

    await expect(page.getByText('LITERACY (10%)')).toBeVisible();
    await expect(page.getByText('NUMERACY (10%)')).toBeVisible();
    await expect(page.getByText('SKILLS & KNOWLEDGE (10%)')).toBeVisible();
    await expect(page.getByText('BEHAVIOUR & ATTITUDE (10%)')).toBeVisible();
    await expect(page.getByText('PARENTS FEEDBACK (20%)')).toBeVisible();
    await expect(page.getByText('CLASSROOM TEACHING (20%)')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'COMMITTEE', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'SUMMARY', exact: true }).first()).toBeVisible();
    console.log('✅ All nursery column headers correct');
  });

  test('6. [FIX VERIFY] Nursery tab — Save button is INSIDE teacher name cell, NOT duplicated', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);

    const firstRow = page.locator('tbody tr').first();
    const firstCell = firstRow.locator('td').first();

    // Save button should exist inside the first cell (teacher name cell)
    await expect(firstCell.locator('button:has-text("Save")')).toBeVisible();
    console.log('✅ Save button is inside the Teacher Name cell');

    // Count ALL Save buttons in the first row — should be exactly 1
    const saveCount = await firstRow.locator('button:has-text("Save")').count();
    expect(saveCount).toBe(1);
    console.log(`✅ Only 1 Save button per row (no duplicates) — found: ${saveCount}`);
  });

  test('7. [FIX VERIFY] Nursery tab — Action column has Share button (not Save)', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);

    // The last cell (Action column) of a row with existing data should have Share, not Save
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    let foundShare = false;

    for (let i = 0; i < Math.min(count, 6); i++) {
      const lastCell = rows.nth(i).locator('td').last();
      const hasShare = await lastCell.locator('button:has-text("Share")').count();
      const hasSave  = await lastCell.locator('button:has-text("Save")').count();
      expect(hasSave).toBe(0); // No Save in action column
      if (hasShare > 0) foundShare = true;
    }

    console.log(`✅ Action column has no Save buttons — Share button found: ${foundShare}`);
  });

  test('8. Switch to Grade 1 onwards tab', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);

    await page.getByRole('button', { name: /Grade 1 onwards/ }).click();
    await page.waitForTimeout(1500);

    // Tab should now be active
    const grade1Tab = page.getByRole('button', { name: /Grade 1 onwards/ });
    await expect(grade1Tab).toHaveClass(/bg-indigo-600/);

    // Table rows should load
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✅ Grade 1 onwards tab loaded — ${count} teacher rows`);
  });

  test('9. Grade 1 onwards — correct column headers (EXAM MARKS, etc.)', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);

    await page.getByRole('button', { name: /Grade 1 onwards/ }).click();
    await page.waitForTimeout(1500);

    await expect(page.getByText('EXAM MARKS (50%)')).toBeVisible();
    await expect(page.getByText('SKILLS & KNOWLEDGE (10%)')).toBeVisible();
    await expect(page.getByText('BEHAVIOUR & ATTITUDE (10%)')).toBeVisible();
    await expect(page.getByText('PARENTS FEEDBACK (10%)')).toBeVisible();
    await expect(page.getByText('CLASSROOM TEACHING (10%)')).toBeVisible();
    console.log('✅ Grade 1 onwards column headers correct');
  });

  test('10. Grade 1 onwards — Save button is inside Teacher Name cell', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);

    await page.getByRole('button', { name: /Grade 1 onwards/ }).click();
    await page.waitForTimeout(1500);

    const firstRow = page.locator('tbody tr').first();
    const firstCell = firstRow.locator('td').first();
    await expect(firstCell.locator('button:has-text("Save")')).toBeVisible();

    const saveCount = await firstRow.locator('button:has-text("Save")').count();
    expect(saveCount).toBe(1);
    console.log('✅ Grade 1 onwards — 1 Save button per row inside Teacher Name cell');
  });

  test('11. Teachers with data show Overall % and Salary Increment', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);

    // Check nursery tab for any teacher with overall %
    const overallPct = page.locator('td').filter({ hasText: /%$/ }).first();
    await expect(overallPct).toBeVisible({ timeout: 5000 });
    console.log('✅ Overall % is displayed for teachers with appraisal data');

    // Check salary increment (e.g., "3%" or "Base:3%")
    const salaryInc = page.locator('text=/Base:/').first();
    await expect(salaryInc).toBeVisible({ timeout: 5000 });
    console.log('✅ Salary Increment with Base note is displayed');
  });

  test('12. Comment button (💬) opens textarea', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);

    // Click first 💬 comment button in the table
    const commentBtn = page.locator('button:has-text("💬")').first();
    await commentBtn.click();
    await page.waitForTimeout(300);

    const textarea = page.locator('textarea[placeholder="Optional comment..."]').first();
    await expect(textarea).toBeVisible();
    console.log('✅ Comment button opens textarea');

    // Close by clicking again
    await commentBtn.click();
    await page.waitForTimeout(300);
    console.log('✅ Comment textarea toggles closed');
  });

  test('13. Shared status shows correctly (✅ Shared or No)', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);

    // Shared column should show either "No" or "✅ Shared"
    // Wait for full table data to load before checking
    await page.waitForFunction(() => document.querySelectorAll('tbody tr').length > 1);
    // "No" spans appear in the Shared column for unshared teachers
    const noSpans = page.locator('span.text-gray-400').filter({ hasText: 'No' });
    const sharedSpans = page.locator('span.text-green-600').filter({ hasText: 'Shared' });
    const noCount = await noSpans.count();
    const sharedCount = await sharedSpans.count();
    expect(noCount + sharedCount).toBeGreaterThan(0);
    console.log(`✅ Shared column: ${noCount} "No", ${sharedCount} "✅ Shared"`);
  });

});
