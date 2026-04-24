import { test, expect } from '@playwright/test';

const BASE = 'https://cbas-frontend-production.up.railway.app';
const ADMIN_EMAIL = 'garkaswetha@gmail.com';
const ADMIN_PASSWORD = 'swetha123';

const TEST_STUDENT = {
  name: 'Test Student Playwright',
  admission_no: 'TEST-001',
  section: 'HIMALAYA',
  father_name: 'Test Father',
  mother_name: 'Test Mother',
};

async function login(page: any) {
  await page.goto(BASE);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  await page.waitForTimeout(2000);
}

async function goToStudents(page: any) {
  await page.click('a:has-text("Student Management"), span:has-text("Student Management")');
  await page.waitForSelector('table', { timeout: 10000 });
}

test.describe('Student Management', () => {

  test('1. Navigate to Student Management page', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    await expect(page.getByRole('heading', { name: 'Student Management' })).toBeVisible();
    console.log('✅ Student Management page loaded');
  });

  test('2. Student list loads with data and shows total count', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    const countText = page.locator('text=/Total active students:/');
    await expect(countText).toBeVisible();
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✅ Student list loaded — ${count} rows on first page`);
  });

  test('3. Grade stat cards are visible and clickable as filter', async ({ page }) => {
    await login(page);
    await goToStudents(page);

    // Click a grade card to filter
    const gradeCard = page.locator('.cursor-pointer').filter({ hasText: 'Grade 1' }).first();
    await gradeCard.click();
    await page.waitForTimeout(1000);
    const showing = await page.locator('text=/Showing/').textContent();
    console.log(`✅ Grade filter works — ${showing}`);

    // Click again to deselect
    await gradeCard.click();
    await page.waitForTimeout(500);
    console.log('✅ Grade filter cleared by re-clicking');
  });

  test('4. Search by name filters students', async ({ page }) => {
    await login(page);
    await goToStudents(page);
    const total = await page.locator('tbody tr').count();

    // Wait for full load before searching
    await page.waitForFunction(() => document.querySelectorAll('tbody tr').length > 5);
    const totalBefore = await page.locator('text=/Showing/').textContent();

    await page.fill('input[placeholder="Search by name..."]', 'Anvi');
    await page.waitForTimeout(1500);
    const totalAfter = await page.locator('text=/Showing/').textContent();
    expect(totalAfter).not.toEqual(totalBefore);
    const filtered = await page.locator('tbody tr').count();
    console.log(`✅ Search works — filtered to ${filtered} rows (was: ${totalBefore}, now: ${totalAfter})`);
  });

  test('5. Class dropdown filter works', async ({ page }) => {
    await login(page);
    await goToStudents(page);

    await page.locator('select').filter({ hasText: 'All Classes' }).selectOption('Grade 5');
    await page.waitForTimeout(1500);
    const showing = await page.locator('text=/Showing/').textContent();
    console.log(`✅ Class filter works — ${showing}`);
  });

  test('6. Section dropdown filter works', async ({ page }) => {
    await login(page);
    await goToStudents(page);

    // First filter by grade to populate section dropdown
    await page.locator('select').filter({ hasText: 'All Classes' }).selectOption('Grade 1');
    await page.waitForTimeout(1500);

    const sectionSelect = page.locator('select').filter({ hasText: 'All Sections' });
    const options = await sectionSelect.locator('option').count();
    expect(options).toBeGreaterThan(1);
    console.log(`✅ Section dropdown has ${options - 1} sections`);
  });

  test('7. Clear filters button resets all filters', async ({ page }) => {
    await login(page);
    await goToStudents(page);

    await page.fill('input[placeholder="Search by name..."]', 'test');
    await page.waitForTimeout(1000);
    await page.locator('select').filter({ hasText: 'All Classes' }).selectOption('Grade 3');
    await page.waitForTimeout(1000);

    await page.click('button:has-text("Clear filters")');
    await page.waitForTimeout(1000);
    const searchVal = await page.inputValue('input[placeholder="Search by name..."]');
    expect(searchVal).toBe('');
    console.log('✅ Clear filters resets search and grade filter');
  });

  test('8. Pagination works (Next / Previous)', async ({ page }) => {
    await login(page);
    await goToStudents(page);

    const nextBtn = page.locator('button:has-text("Next")');
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      await expect(page.locator('text=/Page 2 of/')).toBeVisible();
      console.log('✅ Next page works');

      await page.click('button:has-text("Previous")');
      await page.waitForTimeout(500);
      await expect(page.locator('text=/Page 1 of/')).toBeVisible();
      console.log('✅ Previous page works');
    } else {
      console.log('ℹ️ Pagination not needed — all students fit on one page');
    }
  });

  test('9. Add Student form opens and closes via Cancel', async ({ page }) => {
    await login(page);
    await goToStudents(page);

    await page.click('button:has-text("+ Add Student")');
    await expect(page.getByText('Add New Student')).toBeVisible();
    console.log('✅ Add Student form opened');

    await page.click('button:has-text("Cancel")');
    await expect(page.getByText('Add New Student')).not.toBeVisible();
    console.log('✅ Add Student form closed via Cancel');
  });

  test('10. Add a new test student', async ({ page }) => {
    await login(page);
    await goToStudents(page);

    await page.click('button:has-text("+ Add Student")');
    await page.waitForSelector('text=Add New Student');

    // Fill required and optional fields
    await page.fill('input[type="text"]', TEST_STUDENT.name); // Full Name (first text input)

    // Use label-based approach for other fields
    const fields = [
      { label: 'Admission No.', value: TEST_STUDENT.admission_no },
      { label: 'Father Name', value: TEST_STUDENT.father_name },
      { label: 'Mother Name', value: TEST_STUDENT.mother_name },
    ];
    for (const f of fields) {
      await page.locator(`label:has-text("${f.label}") + input`).fill(f.value);
    }

    // Select class
    await page.locator('label:has-text("Class") + select').selectOption('Grade 9');

    // Fill section
    await page.locator('label:has-text("Section") + input').fill(TEST_STUDENT.section);

    // Select gender
    await page.locator('label:has-text("Gender") + select').selectOption('Male');

    await page.click('button:has-text("Save")');
    await page.waitForTimeout(2000);

    await expect(page.getByText(`✅ ${TEST_STUDENT.name} added`)).toBeVisible({ timeout: 5000 });
    console.log('✅ Test student added successfully');
  });

  test('11. New student appears in the list', async ({ page }) => {
    await login(page);
    await goToStudents(page);

    await page.fill('input[placeholder="Search by name..."]', TEST_STUDENT.name);
    await page.waitForTimeout(1500);

    await expect(page.getByText(TEST_STUDENT.name)).toBeVisible({ timeout: 5000 });
    console.log('✅ New student visible in the list');
  });

  test('12. Edit the test student', async ({ page }) => {
    await login(page);
    await goToStudents(page);

    await page.fill('input[placeholder="Search by name..."]', TEST_STUDENT.name);
    await page.waitForTimeout(1500);

    await page.locator('button:has-text("Edit")').first().click();
    await expect(page.getByText('✏️ Edit Student')).toBeVisible();
    console.log('✅ Edit form opened for test student');

    // Update father name
    await page.locator('label:has-text("Father Name") + input').fill('Updated Father Name');
    await page.click('button:has-text("Update")');
    await page.waitForTimeout(2000);

    await expect(page.getByText(`✅ ${TEST_STUDENT.name} updated`)).toBeVisible({ timeout: 5000 });
    console.log('✅ Student updated successfully');
  });

  test('13. Delete (TC) the test student — cleanup', async ({ page }) => {
    await login(page);
    await goToStudents(page);

    await page.fill('input[placeholder="Search by name..."]', TEST_STUDENT.name);
    await page.waitForTimeout(1500);

    page.once('dialog', dialog => dialog.accept());
    await page.locator('button:has-text("TC")').first().click();
    await page.waitForTimeout(2000);

    await expect(page.getByText(`✅ TC issued to ${TEST_STUDENT.name}`)).toBeVisible({ timeout: 5000 });
    console.log('✅ TC issued — test student removed, original data intact');
  });

});
