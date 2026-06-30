import { test, expect } from '@playwright/test';
import axios from 'axios';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const BASE = 'https://cbas-frontend-production.up.railway.app';
const API  = 'https://cbas-backend-production.up.railway.app';
const ADMIN_EMAIL    = 'garkaswetha@gmail.com';
const ADMIN_PASSWORD = 'swetha123';
const YEAR = '2025-26';

// Seeded test teachers — created in beforeAll so they always exist
const G1_TEACHER   = 'E2E Grade Teacher';
const NURS_TEACHER = 'E2E Nursery Teacher';

// ── SEED HELPERS ────────────────────────────────────────────────────────────
async function seedUser(data: {
  name: string; email: string; password: string; role: string;
  assigned_classes?: string[]; appraisal_qualification?: string;
}) {
  try {
    await axios.post(`${API}/users`, data);
    console.log(`[seed] Created user: ${data.email}`);
  } catch (err: any) {
    if (err?.response?.status === 409) {
      console.log(`[seed] User already exists: ${data.email}`);
    } else {
      console.error(`[seed] Failed to create ${data.email}:`, err?.response?.data);
      throw err;
    }
  }
}

async function login(page: any) {
  await page.goto(BASE, { timeout: 90000 });
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  // Wait for admin nav to confirm login succeeded (backend cold start can take 30-60s)
  await page.waitForSelector('a:has-text("Teachers Appraisal"), a[href*="appraisal"]', { timeout: 60000 });
}

async function goToAppraisal(page: any) {
  await page.click('a:has-text("Teachers Appraisal"), a[href*="appraisal"]');
  await page.waitForSelector('table', { timeout: 20000 });
  await page.waitForFunction(() => document.querySelectorAll('tbody tr').length > 1, {}, { timeout: 25000 });
}

async function openImportPanel(page: any) {
  const importBtn = page.locator('button:has-text("Import Excel")');
  await expect(importBtn).toBeVisible();
  await importBtn.click();
  await expect(page.locator('h3:has-text("Import Appraisals from Excel")')).toBeVisible({ timeout: 5000 });
}

async function teacherAppraisalByName(name: string) {
  const res = await axios.get(`${API}/appraisal?academic_year=${YEAR}`);
  return (res.data as any[]).find((t: any) => t.teacher_name === name);
}

// Creates a temp XLSX file; caller must delete
function createXlsx(g1Rows: any[], nursRows: any[]): string {
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(g1Rows.length > 0 ? g1Rows : [{ 'Teacher Name': '' }]);
  XLSX.utils.book_append_sheet(wb, ws1, 'Grade1+ Teachers');
  const ws2 = XLSX.utils.json_to_sheet(nursRows.length > 0 ? nursRows : [{ 'Teacher Name': '' }]);
  XLSX.utils.book_append_sheet(wb, ws2, 'Nursery Teachers');
  const p = path.join(os.tmpdir(), `appraisal_import_e2e_${Date.now()}.xlsx`);
  XLSX.writeFile(wb, p);
  return p;
}

function makeG1Row(name: string, overrides: Record<string, any> = {}) {
  return {
    'Teacher Name': name,
    'PA1': 75, 'PA2': 80, 'PA3': 70, 'PA4': 65, 'SA1': 85, 'SA2': 90,
    'Workshops': '3',           // → ATTENDED 21 TO 40:- 1.5 MARKS
    'Training': '1',            // → CONDUCTED 1 TRAINING:- 1 MARK
    'Books Read': '2',          // → 6 TO 8:- 1.5 MARKS
    'Articles': '1',            // → 1 TO 2:- 1 MARK
    'Strategies': '1',          // → 1 TO 2:- 1 MARK
    'Team Work': '2',           // → HIGHLY CO-OPERATIVE: 2 MARKS
    'Attitude': '1',            // → SOMETIMES RESPECTFUL & FAIR:- 1 MARK
    'Commitment': '2',          // → FULLY COMMITTED & ACTIVELY PROMOTES SCHOOL VALUES:- 2 MARKS
    'Adaptability': '1',        // → GENERALLY ADAPTABLE & FLEXIBLE:- 1 MARK
    'Dressing': '2',            // → ALWAYS CLEAN, NEAT & WELL PRESENTED PROFESSIONALLY:- 2 MARKS
    'Parents Feedback': '2',    // → BELOW 5:- 8%
    'Classroom': '3',           // → 16 TO 19:- 8 MARKS
    'English Comm': '2',        // → BELOW 5:- 8%
    'Phonics': 'Y', 'Math': 'N', 'Reading': 'Y', 'Handwriting': 'N',
    'Kannada Reading': 'N', 'Notes/HW': 'Y', 'Library': 'N',
    'Parental Engagement': 'N', 'Below A Students': 'N',
    'English Grammar': 'N', 'Others': 'N',
    'Committee Role': 'NONE',
    'Committee Name': '',
    ...overrides,
  };
}

function makeNursRow(name: string, overrides: Record<string, any> = {}) {
  return {
    'Teacher Name': name,
    'Literacy Band': 'G',       // → REGULAR LITERACY PRACTICE USING STORIES, SONGS & WRITING - GOOD - 3
    'Numeracy Band': 'E',       // → HANDS ON NUMBER CONCEPTS (COUNTING, PATTERNS, ETC) - EXCELLENT - 5 MARKS
    'Workshops': '4',           // → ATTENDED 41 TO 50:- 2 MARKS
    'Training': '2',            // → CONDUCTED 2 TRAINING:- 2 MARKS
    'Books Read': '3',          // → 8 & ABOVE:- 2 MARKS
    'Articles': '2',            // → 2 & ABOVE:- 2 MARKS
    'Strategies': '2',          // → 2 & ABOVE:- 2 MARKS
    'Team Work': '2',           // → HIGHLY CO-OPERATIVE: 2 MARKS
    'Attitude': '2',            // → RESPECTFUL & FAIR TOWARDS STUDENTS:- 2 MARKS
    'Commitment': '1',          // → GENERALLY COMMITTED & SUPPORTS SCHOOL VALUES:- 1 MARK
    'Adaptability': '1',        // → GENERALLY ADAPTABLE & FLEXIBLE:- 1 MARK
    'Dressing': '2',            // → ALWAYS CLEAN, NEAT & WELL PRESENTED PROFESSIONALLY:- 2 MARKS
    'Parents Feedback': '1',    // → BELOW 3:- 10%
    'Classroom': '4',           // → 20 & ABOVE:- 10 MARKS
    'English Comm': '1',        // → BELOW 3:- 10%
    'Phonics': 'Y', 'Math': 'Y', 'Reading': 'N', 'Handwriting': 'N',
    'Kannada Reading': 'N', 'Notes/HW': 'N', 'Library': 'N',
    'Parental Engagement': 'N', 'Below A Students': 'N',
    'English Grammar': 'N', 'Others': 'N',
    'Committee Role': 'LEAD',
    'Committee Name': 'E2E Committee',
    ...overrides,
  };
}

test.describe('E2E — Appraisal Excel Import (comprehensive)', () => {
  test.setTimeout(120000);

  test.beforeAll(async () => {
    // Seed the principal account so login works on a fresh Neon database
    await seedUser({ name: 'Swetha Garka', email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'principal' });

    // Seed a Grade 1+ teacher used in all Grade 1+ tests
    await seedUser({
      name: G1_TEACHER,
      email: 'e2e.grade@test.com',
      password: 'test123',
      role: 'teacher',
      assigned_classes: ['Grade 3'],
      appraisal_qualification: 'BED',
    });

    // Seed a Nursery teacher used in all Nursery tests
    await seedUser({
      name: NURS_TEACHER,
      email: 'e2e.nursery@test.com',
      password: 'test123',
      role: 'teacher',
      assigned_classes: ['LKG'],
      appraisal_qualification: 'NTT',
    });

    console.log('[seed] All seed users ready');
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 1 — PANEL OPEN / CLOSE
  // ══════════════════════════════════════════════════════════════

  test('1. Import Excel button is visible in filter bar', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    const btn = page.locator('button:has-text("Import Excel")');
    await expect(btn).toBeVisible();
    console.log('✅ Import Excel button visible in filter bar');
  });

  test('2. Clicking Import Excel opens panel with Step 1 and Step 2', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    await openImportPanel(page);
    await expect(page.locator('text="Step 1 — Download Template"')).toBeVisible();
    await expect(page.locator('text="Step 2 — Upload Filled Template"')).toBeVisible();
    await expect(page.locator('button:has-text("Download Template")')).toBeVisible();
    await expect(page.locator('input[type="file"][accept*=".xlsx"]')).toBeVisible();
    console.log('✅ Import panel opened with Step 1 and Step 2');
  });

  test('3. × button dismisses the import panel', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    await openImportPanel(page);
    await page.locator('h3:has-text("Import Appraisals from Excel")').locator('..').locator('button:has-text("×")').click();
    await expect(page.locator('h3:has-text("Import Appraisals from Excel")')).not.toBeVisible({ timeout: 3000 });
    console.log('✅ × button closes import panel');
  });

  test('4. Import Excel button toggles panel open/closed', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    await page.locator('button:has-text("Import Excel")').click();
    await expect(page.locator('h3:has-text("Import Appraisals from Excel")')).toBeVisible({ timeout: 5000 });
    await page.locator('button:has-text("Import Excel")').click();
    await expect(page.locator('h3:has-text("Import Appraisals from Excel")')).not.toBeVisible({ timeout: 3000 });
    console.log('✅ Import Excel button toggles panel');
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 2 — DOWNLOAD TEMPLATE
  // ══════════════════════════════════════════════════════════════

  test('5. Download Template triggers .xlsx file download named appraisal_template_YEAR.xlsx', async ({ page }) => {
    await login(page);
    await goToAppraisal(page);
    await openImportPanel(page);
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      page.locator('button:has-text("Download Template")').click(),
    ]);
    const filename = download.suggestedFilename();
    expect(filename).toContain('appraisal_template_');
    expect(filename).toContain(YEAR);
    expect(filename.endsWith('.xlsx')).toBe(true);
    console.log(`✅ Template downloaded: "${filename}"`);
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 3 — FILE UPLOAD & PREVIEW
  // ══════════════════════════════════════════════════════════════

  test('6. Uploading file with seeded G1 teacher shows ✓ Found in preview', async ({ page }) => {
    const filePath = createXlsx([makeG1Row(G1_TEACHER)], []);
    try {
      await login(page);
      await goToAppraisal(page);
      await openImportPanel(page);
      await page.locator('input[type="file"]').setInputFiles(filePath);
      await page.waitForTimeout(2000);

      await expect(page.locator('th').filter({ hasText: /^Teacher$/ }).first()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('th').filter({ hasText: /^Type$/ }).first()).toBeVisible();
      await expect(page.locator('th').filter({ hasText: /^Match$/ }).first()).toBeVisible();

      const previewRow = page.locator('tbody tr').filter({ hasText: G1_TEACHER });
      await expect(previewRow.locator('span:has-text("✓ Found")')).toBeVisible({ timeout: 5000 });
      await expect(previewRow.locator('td').nth(1)).toHaveText('Grade 1+');
      console.log(`✅ Preview shows ✓ Found for: ${G1_TEACHER}`);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  test('7. Uploading file with seeded Nursery teacher shows ✓ Found and type=Nursery', async ({ page }) => {
    const filePath = createXlsx([], [makeNursRow(NURS_TEACHER)]);
    try {
      await login(page);
      await goToAppraisal(page);
      await openImportPanel(page);
      await page.locator('input[type="file"]').setInputFiles(filePath);
      await page.waitForTimeout(2000);

      const previewRow = page.locator('tbody tr').filter({ hasText: NURS_TEACHER });
      await expect(previewRow.locator('span:has-text("✓ Found")')).toBeVisible({ timeout: 5000 });
      await expect(previewRow.locator('td').nth(1)).toHaveText('Nursery');
      console.log(`✅ Preview shows ✓ Found, type=Nursery for: ${NURS_TEACHER}`);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  test('8. Uploading file with a fake name shows ✗ Not found in preview', async ({ page }) => {
    const fakeName = 'ZZZ Nonexistent Teacher XYZ';
    const filePath = createXlsx([makeG1Row(fakeName)], []);
    try {
      await login(page);
      await goToAppraisal(page);
      await openImportPanel(page);
      await page.locator('input[type="file"]').setInputFiles(filePath);
      await page.waitForTimeout(2000);

      const previewRow = page.locator('tbody tr').filter({ hasText: fakeName });
      await expect(previewRow.locator('span:has-text("✗ Not found")')).toBeVisible({ timeout: 5000 });
      console.log('✅ Preview shows ✗ Not found for fake teacher');
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  test('9. Mixed file preview shows both sheets — G1 and Nursery rows', async ({ page }) => {
    const filePath = createXlsx([makeG1Row(G1_TEACHER)], [makeNursRow(NURS_TEACHER)]);
    try {
      await login(page);
      await goToAppraisal(page);
      await openImportPanel(page);
      await page.locator('input[type="file"]').setInputFiles(filePath);
      await page.waitForTimeout(2000);

      // Scope to the preview table specifically by its unique "Match" column header
      const previewTable = page.locator('table').filter({ has: page.locator('th').filter({ hasText: /^Match$/ }) });
      const previewRows = previewTable.locator('tbody tr');
      await expect(previewRows).toHaveCount(2, { timeout: 5000 });

      await expect(page.locator('tbody tr').filter({ hasText: G1_TEACHER }).locator('td').nth(1)).toHaveText('Grade 1+');
      await expect(page.locator('tbody tr').filter({ hasText: NURS_TEACHER }).locator('td').nth(1)).toHaveText('Nursery');
      console.log('✅ Mixed file preview shows 2 rows (G1+ and Nursery)');
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  test('10. Import button disabled and shows 0 records when all names unmatched', async ({ page }) => {
    const filePath = createXlsx([makeG1Row('Fake Teacher Alpha 999'), makeG1Row('Fake Teacher Beta 999')], []);
    try {
      await login(page);
      await goToAppraisal(page);
      await openImportPanel(page);
      await page.locator('input[type="file"]').setInputFiles(filePath);
      await page.waitForTimeout(2000);

      const importBtn = page.locator('button').filter({ hasText: /Import \d+ record/ });
      await expect(importBtn).toBeVisible({ timeout: 5000 });
      await expect(importBtn).toBeDisabled();
      expect(await importBtn.textContent()).toContain('0 records');
      console.log('✅ Import button disabled, shows 0 records for all-unmatched file');
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  test('11. Import button shows correct count when only some rows match', async ({ page }) => {
    const filePath = createXlsx([makeG1Row(G1_TEACHER), makeG1Row('Fake Teacher XYZ 999')], []);
    try {
      await login(page);
      await goToAppraisal(page);
      await openImportPanel(page);
      await page.locator('input[type="file"]').setInputFiles(filePath);
      await page.waitForTimeout(2000);

      const importBtn = page.locator('button').filter({ hasText: /Import \d+ record/ });
      await expect(importBtn).toBeEnabled({ timeout: 5000 });
      expect(await importBtn.textContent()).toContain('1 record');
      console.log('✅ Import button shows "1 record" (1 matched, 1 unmatched)');
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 4 — FULL GRADE 1+ IMPORT FLOW
  // ══════════════════════════════════════════════════════════════

  test('12. Full Grade 1+ import: browser success + API data verified', async ({ page }) => {
    const filePath = createXlsx([makeG1Row(G1_TEACHER)], []);
    try {
      await login(page);
      await goToAppraisal(page);
      await openImportPanel(page);
      await page.locator('input[type="file"]').setInputFiles(filePath);
      await page.waitForTimeout(2000);

      await expect(page.locator('tbody tr').filter({ hasText: G1_TEACHER }).locator('span:has-text("✓ Found")')).toBeVisible({ timeout: 5000 });

      await page.locator('button').filter({ hasText: /Import \d+ record/ }).click();
      await page.waitForTimeout(5000);

      // Browser: success result
      const resultSpan = page.locator('span.text-xs.text-gray-600').filter({ hasText: /imported/ });
      await expect(resultSpan).toBeVisible({ timeout: 10000 });
      expect(await resultSpan.textContent()).toContain('1 imported');
      console.log('✅ Browser shows 1 imported');

      // API Layer: verify data stored
      const t = await teacherAppraisalByName(G1_TEACHER);
      const a = t?.appraisal;
      expect(a).toBeTruthy();
      expect(parseFloat(a.pa1)).toBe(75);
      expect(parseFloat(a.pa2)).toBe(80);
      expect(parseFloat(a.pa3)).toBe(70);
      expect(parseFloat(a.pa4)).toBe(65);
      expect(parseFloat(a.sa1)).toBe(85);
      expect(parseFloat(a.sa2)).toBe(90);
      expect(a.workshops).toBe('ATTENDED 21 TO 40:- 1.5 MARKS');
      expect(a.training_sessions).toBe('CONDUCTED 1 TRAINING:- 1 MARK');
      expect(a.team_work).toBe('HIGHLY CO-OPERATIVE: 2 MARKS');
      expect(a.parents_feedback_band).toBe('BELOW 5:- 8%');
      expect(a.classroom_observation_band).toBe('16 TO 19:- 8 MARKS');
      expect(a.english_comm_band).toBe('BELOW 5:- 8%');
      expect(a.resp_phonics).toBe(true);
      expect(a.resp_math).toBe(false);
      expect(a.resp_reading).toBe(true);
      expect(a.resp_notes_hw).toBe(true);
      expect(a.committee_role).toBe('NOT INVOLVED');
      console.log(`✅ API verified: PA1=75, all dropdown codes mapped, responsibilities correct`);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 5 — FULL NURSERY IMPORT FLOW
  // ══════════════════════════════════════════════════════════════

  test('13. Full Nursery import: browser success + API data verified', async ({ page }) => {
    const filePath = createXlsx([], [makeNursRow(NURS_TEACHER)]);
    try {
      await login(page);
      await goToAppraisal(page);
      await openImportPanel(page);
      await page.locator('input[type="file"]').setInputFiles(filePath);
      await page.waitForTimeout(2000);

      await expect(page.locator('tbody tr').filter({ hasText: NURS_TEACHER }).locator('span:has-text("✓ Found")')).toBeVisible({ timeout: 5000 });

      await page.locator('button').filter({ hasText: /Import \d+ record/ }).click();
      await page.waitForTimeout(5000);

      const resultSpan = page.locator('span.text-xs.text-gray-600').filter({ hasText: /imported/ });
      await expect(resultSpan).toBeVisible({ timeout: 10000 });
      expect(await resultSpan.textContent()).toContain('1 imported');
      console.log('✅ Browser shows 1 imported (Nursery)');

      // API Layer
      const t = await teacherAppraisalByName(NURS_TEACHER);
      const a = t?.appraisal;
      expect(a).toBeTruthy();
      expect(a.literacy_band).toBe('REGULAR LITERACY PRACTICE USING STORIES, SONGS & WRITING - GOOD - 3');
      expect(a.numeracy_band).toBe('HANDS ON NUMBER CONCEPTS (COUNTING, PATTERNS, ETC) - EXCELLENT - 5 MARKS');
      expect(a.workshops).toBe('ATTENDED 41 TO 50:- 2 MARKS');
      expect(a.classroom_observation_band).toBe('20 & ABOVE:- 10 MARKS');
      expect(a.english_comm_band).toBe('BELOW 3:- 10%');
      expect(a.committee_role).toBe('LEAD');
      expect(a.committee_name).toBe('E2E Committee');
      expect(a.resp_phonics).toBe(true);
      expect(a.resp_math).toBe(true);
      expect(a.resp_reading).toBe(false);
      console.log('✅ API verified: literacy_band, numeracy_band, all codes mapped, committee=LEAD');
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 6 — CODE MAPPING SPOT CHECKS
  // ══════════════════════════════════════════════════════════════

  test('14. Workshops=0 maps to "NOT APPLICABLE :- 0 MARKS" in backend', async ({ page }) => {
    const filePath = createXlsx([makeG1Row(G1_TEACHER, { 'Workshops': '0' })], []);
    try {
      await login(page);
      await goToAppraisal(page);
      await openImportPanel(page);
      await page.locator('input[type="file"]').setInputFiles(filePath);
      await page.waitForTimeout(2000);
      await page.locator('button').filter({ hasText: /Import \d+ record/ }).click();
      await page.waitForTimeout(5000);

      const t = await teacherAppraisalByName(G1_TEACHER);
      expect(t?.appraisal?.workshops).toBe('NOT APPLICABLE :- 0 MARKS');
      console.log('✅ Workshops code 0 → "NOT APPLICABLE :- 0 MARKS"');
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  test('15. Parents Feedback=4 maps to "MORE THAN 10:- 2%" in backend', async ({ page }) => {
    const filePath = createXlsx([makeG1Row(G1_TEACHER, { 'Parents Feedback': '4' })], []);
    try {
      await login(page);
      await goToAppraisal(page);
      await openImportPanel(page);
      await page.locator('input[type="file"]').setInputFiles(filePath);
      await page.waitForTimeout(2000);
      await page.locator('button').filter({ hasText: /Import \d+ record/ }).click();
      await page.waitForTimeout(5000);

      const t = await teacherAppraisalByName(G1_TEACHER);
      expect(t?.appraisal?.parents_feedback_band).toBe('MORE THAN 10:- 2%');
      console.log('✅ Parents Feedback code 4 → "MORE THAN 10:- 2%"');
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  test('16. Nursery Literacy Band=N maps to NEEDS IMPROVEMENT string', async ({ page }) => {
    const filePath = createXlsx([], [makeNursRow(NURS_TEACHER, { 'Literacy Band': 'N' })]);
    try {
      await login(page);
      await goToAppraisal(page);
      await openImportPanel(page);
      await page.locator('input[type="file"]').setInputFiles(filePath);
      await page.waitForTimeout(2000);
      await page.locator('button').filter({ hasText: /Import \d+ record/ }).click();
      await page.waitForTimeout(5000);

      const t = await teacherAppraisalByName(NURS_TEACHER);
      expect(t?.appraisal?.literacy_band).toBe('IRREGULAR OR LESS ENGAGING LITERACY ACTIVITIES - NEEDS IMPROVEMENT - 2');
      console.log('✅ Literacy Band N → NEEDS IMPROVEMENT stored');
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 7 — BACKEND SCORING AFTER IMPORT
  // ══════════════════════════════════════════════════════════════

  test('17. Backend recalculates exam_score from PA1-SA2 after import', async ({ page }) => {
    const filePath = createXlsx([makeG1Row(G1_TEACHER, {
      'PA1': 90, 'PA2': 85, 'PA3': 80, 'PA4': 75, 'SA1': 95, 'SA2': 100,
    })], []);
    try {
      await login(page);
      await goToAppraisal(page);
      await openImportPanel(page);
      await page.locator('input[type="file"]').setInputFiles(filePath);
      await page.waitForTimeout(2000);
      await page.locator('button').filter({ hasText: /Import \d+ record/ }).click();
      await page.waitForTimeout(5000);

      const t = await teacherAppraisalByName(G1_TEACHER);
      const a = t?.appraisal;
      // exam_score = (90+85+80+75+95+100)/600 * 0.5 = 525/600*0.5 = 0.4375
      const expected = (90 + 85 + 80 + 75 + 95 + 100) / 600 * 0.5;
      expect(Math.abs(parseFloat(a?.exam_score || '0') - expected)).toBeLessThan(0.001);
      console.log(`✅ exam_score=${a?.exam_score} (expected ${expected.toFixed(6)})`);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  test('18. Backend stores overall_percentage > 0 after full G1 import', async ({ page }) => {
    const filePath = createXlsx([makeG1Row(G1_TEACHER)], []);
    try {
      await login(page);
      await goToAppraisal(page);
      await openImportPanel(page);
      await page.locator('input[type="file"]').setInputFiles(filePath);
      await page.waitForTimeout(2000);
      await page.locator('button').filter({ hasText: /Import \d+ record/ }).click();
      await page.waitForTimeout(5000);

      const t = await teacherAppraisalByName(G1_TEACHER);
      const pct = parseFloat(t?.appraisal?.overall_percentage || '0');
      expect(pct).toBeGreaterThan(0);
      expect(pct).toBeLessThanOrEqual(100);
      console.log(`✅ overall_percentage = ${pct}%`);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 8 — UNMATCHED TEACHER ERROR REPORTING
  // ══════════════════════════════════════════════════════════════

  test('19. Mixed file: matched teacher imported, unmatched shows error — both reported', async ({ page }) => {
    const fakeName = 'Nonexistent Teacher E2E 777';
    const filePath = createXlsx([makeG1Row(G1_TEACHER), makeG1Row(fakeName)], []);
    try {
      await login(page);
      await goToAppraisal(page);
      await openImportPanel(page);
      await page.locator('input[type="file"]').setInputFiles(filePath);
      await page.waitForTimeout(2000);

      // Button shows 1 record (only real teacher matched)
      const importBtn = page.locator('button').filter({ hasText: /Import \d+ record/ });
      await expect(importBtn.filter({ hasText: '1 record' })).toBeVisible({ timeout: 5000 });

      await importBtn.click();
      await page.waitForTimeout(5000);

      const resultSpan = page.locator('span.text-xs.text-gray-600').filter({ hasText: /imported/ });
      await expect(resultSpan).toBeVisible({ timeout: 10000 });
      const resultText = await resultSpan.textContent();
      expect(resultText).toContain('1 imported');
      expect(resultText).toContain('1 failed');

      // Error list mentions the fake teacher
      await expect(page.locator('ul li').filter({ hasText: fakeName })).toBeVisible({ timeout: 3000 });
      console.log(`✅ Result: "${resultText}" — real teacher imported, fake shows error`);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  // ══════════════════════════════════════════════════════════════
  // GROUP 9 — MIXED SHEET IMPORT (BOTH TEACHERS)
  // ══════════════════════════════════════════════════════════════

  test('20. Mixed import: G1 and Nursery both imported, API verifies both', async ({ page }) => {
    const filePath = createXlsx([makeG1Row(G1_TEACHER)], [makeNursRow(NURS_TEACHER)]);
    try {
      await login(page);
      await goToAppraisal(page);
      await openImportPanel(page);
      await page.locator('input[type="file"]').setInputFiles(filePath);
      await page.waitForTimeout(2000);

      await expect(page.locator('tbody tr').filter({ hasText: G1_TEACHER }).locator('span:has-text("✓ Found")')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('tbody tr').filter({ hasText: NURS_TEACHER }).locator('span:has-text("✓ Found")')).toBeVisible({ timeout: 5000 });

      const importBtn = page.locator('button').filter({ hasText: /Import 2 records/ });
      await expect(importBtn).toBeVisible({ timeout: 5000 });
      await importBtn.click();
      await page.waitForTimeout(6000);

      const resultSpan = page.locator('span.text-xs.text-gray-600').filter({ hasText: /imported/ });
      await expect(resultSpan).toBeVisible({ timeout: 10000 });
      expect(await resultSpan.textContent()).toContain('2 imported');

      // API: both teachers have appraisal data
      const g1Data = await teacherAppraisalByName(G1_TEACHER);
      const nursData = await teacherAppraisalByName(NURS_TEACHER);
      expect(parseFloat(g1Data?.appraisal?.pa1 || '0')).toBeGreaterThan(0);
      expect(nursData?.appraisal?.literacy_band).toContain('GOOD');
      console.log(`✅ Mixed import: both ${G1_TEACHER} and ${NURS_TEACHER} verified`);
    } finally {
      fs.unlinkSync(filePath);
    }
  });
});

