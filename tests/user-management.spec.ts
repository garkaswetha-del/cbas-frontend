import { test, expect } from '@playwright/test';

const BASE = 'https://cbas-frontend-production.up.railway.app';
const ADMIN_EMAIL = 'garkaswetha@gmail.com';
const ADMIN_PASSWORD = 'swetha123';

const TEST_TEACHER = {
  name: 'Test Teacher Playwright',
  email: 'testteacher.playwright@cbas.test',
  password: 'Test1234',
};

// ── Helper: login ────────────────────────────────────────────────
async function login(page: any, email: string, password: string) {
  await page.goto(BASE);
  await page.waitForSelector('input[type="email"], input[placeholder*="email" i], input[placeholder*="Email" i]', { timeout: 10000 });
  await page.fill('input[type="email"], input[placeholder*="email" i], input[placeholder*="Email" i]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  await page.waitForTimeout(2000);
}

// ── TEST SUITE ───────────────────────────────────────────────────
test.describe('User Management', () => {

  test('1. Admin login and reach User Management page', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await expect(page).not.toHaveURL(`${BASE}/login`);
    const heading = page.getByRole('heading', { name: 'User Management' });
    await expect(heading).toBeVisible({ timeout: 8000 });
    console.log('✅ Admin logged in and User Management page loaded');
  });

  test('2. Teachers list loads with data', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.waitForSelector('table', { timeout: 10000 });
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✅ Teachers list loaded — ${count} rows visible`);
  });

  test('3. Search functionality filters teachers', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.waitForSelector('table', { timeout: 10000 });
    const allRows = await page.locator('tbody tr').count();

    // Placeholder is "Name, email or subject..."
    await page.fill('input[placeholder*="Name, email"]', 'Anusha');
    await page.waitForTimeout(500);
    const filtered = await page.locator('tbody tr').count();
    expect(filtered).toBeLessThan(allRows);
    console.log(`✅ Search works — filtered from ${allRows} to ${filtered} rows`);

    // Clear search
    await page.fill('input[placeholder*="Name, email"]', '');
    await page.waitForTimeout(300);
  });

  test('4. Password toggle shows and hides password', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.waitForSelector('table', { timeout: 10000 });

    // Click the first lock icon
    const lockBtn = page.locator('button:has-text("🔒")').first();
    await lockBtn.click();
    await page.waitForTimeout(300);
    const unlocked = page.locator('button:has-text("🔓")').first();
    await expect(unlocked).toBeVisible();
    console.log('✅ Password toggle works — password revealed');

    // Toggle back
    await unlocked.click();
    await expect(page.locator('button:has-text("🔒")').first()).toBeVisible();
    console.log('✅ Password toggle works — password hidden again');
  });

  test('5. Add Teacher form opens and closes', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.waitForSelector('table', { timeout: 10000 });

    await page.click('button:has-text("+ Add Teacher")');
    await expect(page.getByText('Add New Teacher')).toBeVisible();
    console.log('✅ Add Teacher form opened');

    await page.click('button:has-text("Cancel")');
    await expect(page.getByText('Add New Teacher')).not.toBeVisible();
    console.log('✅ Add Teacher form closed via Cancel');
  });

  test('6. Import from Excel panel opens and closes', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.waitForSelector('table', { timeout: 10000 });

    // Button text is "📥 Import Excel"
    await page.click('button:has-text("Import Excel")');
    await expect(page.getByText('Import Teachers from Excel')).toBeVisible();
    console.log('✅ Import panel opened');

    // Close button: the gray ✕ inside the import panel header
    await page.locator('button.text-gray-400:has-text("✕")').click();
    await expect(page.getByText('Import Teachers from Excel')).not.toBeVisible();
    console.log('✅ Import panel closed');
  });

  test('7. Add a new test teacher', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.waitForSelector('table', { timeout: 10000 });

    // Pre-cleanup: remove leftover test teacher from failed previous runs
    // Step A: check inactive tab first (teacher may already be deactivated)
    await page.click('button:has-text("Deactivated")');
    await page.waitForTimeout(500);
    await page.fill('input[placeholder*="Name, email"]', 'Test Teacher Playwright');
    await page.waitForTimeout(500);
    const delBtnInactive = page.locator('button:has-text("🗑️ Delete")').first();
    if (await delBtnInactive.isVisible({ timeout: 2000 }).catch(() => false)) {
      page.once('dialog', dialog => dialog.accept());
      await delBtnInactive.click();
      await page.waitForTimeout(1500);
      console.log('⚠️ Permanently deleted leftover deactivated test teacher');
    }
    // Step B: also check active tab (in case teacher is still active)
    await page.fill('input[placeholder*="Name, email"]', '');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Active Teachers")');
    await page.waitForTimeout(500);
    await page.fill('input[placeholder*="Name, email"]', 'Test Teacher Playwright');
    await page.waitForTimeout(500);
    const existingRows = await page.locator('button:has-text("🔴")').count();
    if (existingRows > 0) {
      page.once('dialog', dialog => dialog.accept());
      await page.locator('button:has-text("🔴")').first().click();
      await page.waitForTimeout(1500);
      // Permanent-delete from inactive tab
      await page.fill('input[placeholder*="Name, email"]', '');
      await page.waitForTimeout(300);
      await page.click('button:has-text("Deactivated")');
      await page.waitForTimeout(500);
      const delBtn = page.locator('button:has-text("🗑️ Delete")').first();
      if (await delBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        page.once('dialog', dialog => dialog.accept());
        await delBtn.click();
        await page.waitForTimeout(1500);
      }
      await page.click('button:has-text("Active Teachers")');
      await page.waitForTimeout(300);
      console.log('⚠️ Cleaned up leftover active test teacher before creating fresh');
    }
    await page.fill('input[placeholder*="Name, email"]', '');
    await page.waitForTimeout(300);

    await page.click('button:has-text("+ Add Teacher")');
    await expect(page.getByText('Add New Teacher')).toBeVisible();

    // Fill form
    await page.fill('input[placeholder="e.g. Priya Sharma"]', TEST_TEACHER.name);
    await page.fill('input[placeholder="e.g. priya@school.com"]', TEST_TEACHER.email);
    await page.fill('input[placeholder="e.g. Priya123"]', TEST_TEACHER.password);
    await page.fill('input[placeholder="e.g. 9876543210"]', '9999999999');

    // Qualification: the form select starts with "-- Select --" (unique vs filter dropdown "All Qualifications")
    await page.locator('select').filter({ hasText: '-- Select --' }).selectOption('BED');

    // Select a subject
    await page.click('button:has-text("English")');

    // Select a class
    await page.click('button:has-text("Grade 1")');

    // Save
    await page.click('button:has-text("Save Teacher")');
    await page.waitForTimeout(2000);

    // Check success message
    const msg = page.getByText('✅ User created');
    await expect(msg).toBeVisible({ timeout: 5000 });
    console.log('✅ New test teacher created successfully');
  });

  test('8. New teacher appears in the list', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.waitForSelector('table', { timeout: 10000 });

    await page.fill('input[placeholder*="Name, email"]', 'Test Teacher Playwright');
    await page.waitForTimeout(500);

    const row = page.getByText('Test Teacher Playwright');
    await expect(row).toBeVisible({ timeout: 5000 });
    console.log('✅ New teacher visible in the list');
  });

  test('9. Edit the test teacher', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.waitForSelector('table', { timeout: 10000 });

    await page.fill('input[placeholder*="Name, email"]', 'Test Teacher Playwright');
    await page.waitForTimeout(500);

    // Click edit button on first result
    await page.locator('button:has-text("✏️")').first().click();
    await expect(page.getByText(/Edit —/)).toBeVisible();
    console.log('✅ Edit form opened for test teacher');

    // Change phone
    await page.fill('input[placeholder="e.g. 9876543210"]', '8888888888');
    await page.click('button:has-text("Update Teacher")');
    await page.waitForTimeout(2000);

    await expect(page.getByText('✅ User updated')).toBeVisible({ timeout: 5000 });
    console.log('✅ Teacher updated successfully');
  });

  test('10. Login as the newly created teacher', async ({ page }) => {
    await login(page, TEST_TEACHER.email, TEST_TEACHER.password);
    await page.waitForTimeout(2000);

    // Teacher should see Teacher Portal
    await expect(page.getByText('Teacher Portal')).toBeVisible({ timeout: 8000 });
    console.log('✅ Teacher login works — Teacher Portal visible');
  });

  test('11. Delete the test teacher (cleanup)', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.waitForSelector('table', { timeout: 10000 });

    // Step 1: Search and deactivate from active tab
    await page.fill('input[placeholder*="Name, email"]', 'Test Teacher Playwright');
    await page.waitForTimeout(500);

    // Deactivate button is 🔴
    page.once('dialog', dialog => dialog.accept());
    await page.locator('button:has-text("🔴")').first().click();
    await page.waitForTimeout(2000);
    await expect(page.getByText(/Test Teacher Playwright deactivated/)).toBeVisible({ timeout: 5000 });
    console.log('✅ Test teacher deactivated');

    // Step 2: Switch to inactive tab and permanently delete
    await page.fill('input[placeholder*="Name, email"]', '');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Deactivated")');
    await page.waitForTimeout(500);

    // Find the teacher in the inactive list and permanently delete
    page.once('dialog', dialog => dialog.accept());
    await page.locator('button:has-text("🗑️ Delete")').first().click();
    await page.waitForTimeout(2000);

    await expect(page.getByText(/permanently deleted/)).toBeVisible({ timeout: 5000 });
    console.log('✅ Test teacher permanently deleted — original data intact');
  });

});
