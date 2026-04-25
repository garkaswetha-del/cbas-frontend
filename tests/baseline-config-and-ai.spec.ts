import { test, expect, request } from '@playwright/test';
import axios from 'axios';

const BASE = 'https://cbas-frontend-production.up.railway.app';
const API  = 'https://cbas-backend-production.up.railway.app';
const ADMIN_EMAIL = 'garkaswetha@gmail.com';
const ADMIN_PASSWORD = 'swetha123';

async function login(page: any) {
  await page.goto(BASE, { timeout: 60000 });
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  await page.waitForTimeout(2000);
}

async function goToBaseline(page: any) {
  await page.click('a:has-text("Baseline"), span:has-text("Baseline")');
  await page.waitForSelector('h1:has-text("Baseline Assessment")', { timeout: 15000 });
  await page.waitForTimeout(1000);
}

// ════════════════════════════════════════════════════════════════
//  GROUP A — CONFIG PERSISTENCE (thresholds + lock)
// ════════════════════════════════════════════════════════════════

test.describe('Config Persistence — thresholds & lock per year/round', () => {

  test('A1. Config API: GET returns defaults for new year/round', async () => {
    const r = await axios.get(`${API}/baseline/config?academic_year=2026-27&round=baseline_5`);
    expect(r.status).toBe(200);
    // New record returns defaults
    expect(+r.data.gap_threshold).toBe(60);
    expect(+r.data.promotion_threshold).toBe(80);
    expect(r.data.is_locked).toBe(false);
    console.log('✅ Config GET returns defaults: gap=60, promo=80, locked=false');
  });

  test('A2. Config API: PATCH saves thresholds per year/round', async () => {
    const year = '2026-27';
    const round = 'baseline_7';
    // Save custom thresholds
    const patch = await axios.patch(`${API}/baseline/config`, {
      academic_year: year, round, gap_threshold: 55, promotion_threshold: 85,
    });
    expect(patch.status).toBe(200);
    expect(+patch.data.gap_threshold).toBe(55);
    expect(+patch.data.promotion_threshold).toBe(85);

    // Verify they're stored: GET same year/round
    const get = await axios.get(`${API}/baseline/config?academic_year=${year}&round=${round}`);
    expect(+get.data.gap_threshold).toBe(55);
    expect(+get.data.promotion_threshold).toBe(85);
    console.log(`✅ Config PATCH + GET: gap=55, promo=85 saved for ${year} ${round}`);

    // Cleanup: restore defaults
    await axios.patch(`${API}/baseline/config`, { academic_year: year, round, gap_threshold: 60, promotion_threshold: 80 });
  });

  test('A3. Config API: lock state saved per grade/section/round/year', async () => {
    const cfg = { academic_year: '2026-27', round: 'baseline_3', grade: 'Grade 1', section: 'TEST_SEC', is_locked: true };
    const patch = await axios.patch(`${API}/baseline/config`, cfg);
    expect(patch.data.is_locked).toBe(true);

    const get = await axios.get(`${API}/baseline/config?academic_year=2026-27&round=baseline_3&grade=Grade+1&section=TEST_SEC`);
    expect(get.data.is_locked).toBe(true);
    console.log('✅ Lock state saved per grade+section+round+year');

    // Cleanup
    await axios.patch(`${API}/baseline/config`, { ...cfg, is_locked: false });
  });

  test('A4. Config API: different rounds have independent thresholds', async () => {
    const year = '2025-26';
    // Round 1 gets gap=50
    await axios.patch(`${API}/baseline/config`, { academic_year: year, round: 'baseline_1', gap_threshold: 50 });
    // Round 2 gets gap=70
    await axios.patch(`${API}/baseline/config`, { academic_year: year, round: 'baseline_2', gap_threshold: 70 });

    const r1 = await axios.get(`${API}/baseline/config?academic_year=${year}&round=baseline_1`);
    const r2 = await axios.get(`${API}/baseline/config?academic_year=${year}&round=baseline_2`);
    expect(+r1.data.gap_threshold).toBe(50);
    expect(+r2.data.gap_threshold).toBe(70);
    console.log(`✅ Independent thresholds: Round1 gap=50, Round2 gap=70`);

    // Restore
    await axios.patch(`${API}/baseline/config`, { academic_year: year, round: 'baseline_1', gap_threshold: 60 });
    await axios.patch(`${API}/baseline/config`, { academic_year: year, round: 'baseline_2', gap_threshold: 60 });
  });

  test('A5. UI: changing gap threshold auto-saves to DB after 800ms', async ({ page }) => {
    await login(page);
    await goToBaseline(page);
    const gapInput = page.locator('input.border-orange-300').first();
    await expect(gapInput).toBeVisible();

    // Change to 55
    await gapInput.fill('55');
    // Wait for debounce + save
    await page.waitForTimeout(1500);

    // Verify via API
    const r = await axios.get(`${API}/baseline/config?academic_year=2025-26&round=baseline_1`);
    expect(+r.data.gap_threshold).toBe(55);
    console.log(`✅ Gap threshold 55 auto-saved to DB via debounce`);

    // Restore
    await gapInput.fill('60');
    await page.waitForTimeout(1500);
  });

  test('A6. UI: promotion threshold auto-saves to DB', async ({ page }) => {
    await login(page);
    await goToBaseline(page);
    const promoInput = page.locator('input.border-green-300').first();
    await promoInput.fill('85');
    await page.waitForTimeout(1500);

    const r = await axios.get(`${API}/baseline/config?academic_year=2025-26&round=baseline_1`);
    expect(+r.data.promotion_threshold).toBe(85);
    console.log('✅ Promotion threshold 85 auto-saved to DB');

    // Restore
    await promoInput.fill('80');
    await page.waitForTimeout(1500);
  });

  test('A7. UI: lock button saves to DB and persists on refresh', async ({ page }) => {
    await login(page);
    await goToBaseline(page);

    // Find grade select by label or by containing "Pre-KG" option
    const gradeSelect = page.locator('select').filter({ hasText: 'Pre-KG' }).first();
    await gradeSelect.selectOption('Grade 1');
    await page.waitForTimeout(1000);

    // Find section select: it's the select that comes AFTER the grade select (has section-like options)
    // We look for a select whose options don't contain round/year/grade text
    let sectionSelect: any = null;
    let sec = '';
    const allSelects = page.locator('select');
    const count = await allSelects.count();
    for (let i = 0; i < count; i++) {
      const opts = await allSelects.nth(i).locator('option').allTextContents();
      // Section select has short section names (not years, not round names, not grade names)
      const looksLikeSection = opts.some((o: string) =>
        o.trim().length > 0 && !o.includes('20') && !o.includes('Round') &&
        !o.includes('Grade') && !o.includes('Pre-KG') && !o.includes('baseline') &&
        !['foundation','preparatory','middle','secondary'].includes(o.toLowerCase())
      );
      if (looksLikeSection && opts.length >= 1 && opts.length <= 10) {
        sectionSelect = allSelects.nth(i);
        const rawOpts = opts.filter((o: string) => o.trim().length > 0);
        sec = rawOpts[0].replace(/^[✓⏳\s]+/, '').trim();
        break;
      }
    }
    if (!sectionSelect || !sec) {
      console.log('⚠️ No section select found for Grade 1 — skipping lock persistence test');
      return;
    }
    await sectionSelect.selectOption({ index: 0 });
    await page.waitForTimeout(800);

    // Lock it
    const lockBtn = page.locator('button').filter({ hasText: /🔓 Lock|🔒 Locked/ }).first();
    await expect(lockBtn).toBeVisible({ timeout: 5000 });
    const wasLocked = (await lockBtn.textContent())?.includes('Locked');
    if (!wasLocked) await lockBtn.click();
    await page.waitForTimeout(2000); // wait for PATCH to complete

    // Verify via API
    const r = await axios.get(`${API}/baseline/config?academic_year=2025-26&round=baseline_1&grade=Grade+1&section=${encodeURIComponent(sec)}`);
    expect(r.data.is_locked).toBe(true);
    console.log(`✅ Lock saved to DB for Grade 1 "${sec}" Round 1`);

    // Reload page and check lock state is restored
    await goToBaseline(page);
    await page.locator('select').filter({ hasText: 'Pre-KG' }).first().selectOption('Grade 1');
    await page.waitForTimeout(1000);
    await sectionSelect.selectOption({ index: 0 });
    await page.waitForTimeout(2000);
    const lockBtnAfter = page.locator('button').filter({ hasText: /🔓 Lock|🔒 Locked/ }).first();
    const afterText = await lockBtnAfter.textContent();
    expect(afterText).toContain('Locked');
    console.log('✅ Lock state persists after page reload — loaded from DB');

    // Cleanup: unlock
    await lockBtnAfter.click();
    await page.waitForTimeout(1500);
  });

  test('A8. UI: thresholds load from DB when switching rounds', async ({ page }) => {
    // Set round 3 to have gap=45 via API
    await axios.patch(`${API}/baseline/config`, { academic_year: '2025-26', round: 'baseline_3', gap_threshold: 45, promotion_threshold: 75 });

    await login(page);
    await goToBaseline(page);

    // Switch to Round 3
    const roundSelect = page.locator('select').filter({ hasText: 'Round 1' }).first();
    await roundSelect.selectOption('baseline_3');
    await page.waitForTimeout(1500); // wait for DB load

    const gapInput = page.locator('input.border-orange-300').first();
    const promoInput = page.locator('input.border-green-300').first();
    const gapVal = await gapInput.inputValue();
    const promoVal = await promoInput.inputValue();
    expect(+gapVal).toBe(45);
    expect(+promoVal).toBe(75);
    console.log(`✅ Round 3 thresholds loaded from DB: gap=${gapVal}, promo=${promoVal}`);

    // Restore
    await axios.patch(`${API}/baseline/config`, { academic_year: '2025-26', round: 'baseline_3', gap_threshold: 60, promotion_threshold: 80 });
  });

});

// ════════════════════════════════════════════════════════════════
//  GROUP B — AI ASSESSMENT PAPER: GAP-BASED GENERATION
// ════════════════════════════════════════════════════════════════

test.describe('AI Assessment Paper — gap-based generation', () => {

  let testTeacherId: string;
  let testTeacherName: string;
  let originalData: any = null;

  const TEST_ROUND = 'baseline_9'; // Use a high round so buildGaps picks it as latest

  test.beforeAll(async () => {
    // Get the first teacher from the system
    const r = await axios.get(`${API}/users?role=teacher&limit=5`);
    const teachers: any[] = r.data?.data || r.data || [];
    if (!teachers.length) throw new Error('No teachers found');
    testTeacherId = teachers[0].id;
    testTeacherName = teachers[0].name;

    // Backup existing baseline_9 data if any
    try {
      const existing = await axios.get(`${API}/baseline/teacher/${testTeacherId}?academic_year=2025-26`);
      const r9 = (existing.data?.assessments || []).find((a: any) => a.round === TEST_ROUND);
      if (r9) originalData = r9;
    } catch {}

    // Save test data to baseline_9: low literacy, high numeracy → 4 literacy gap domains
    await axios.post(`${API}/baseline/teacher`, {
      teacher_id: testTeacherId,
      teacher_name: testTeacherName,
      academic_year: '2025-26',
      round: TEST_ROUND,
      stage: 'foundation',
      lit_stage: 'foundation',
      num_stage: 'foundation',
      literacy_scores:  { Listening: 2, Speaking: 1, Reading: 3, Writing: 2 },
      numeracy_scores:  { Operations: 9, 'Base 10': 8, Measurement: 9, Geometry: 9 },
      max_marks: {
        Listening: 10, Speaking: 10, Reading: 10, Writing: 10,
        Operations: 10, 'Base 10': 10, Measurement: 10, Geometry: 10,
      },
    });
    console.log(`✅ Test data saved for ${testTeacherName} in ${TEST_ROUND}: Literacy 20/10/30/20%, Numeracy 90/80/90/90%`);
  });

  test.afterAll(async () => {
    if (originalData) {
      await axios.post(`${API}/baseline/teacher`, {
        teacher_id: testTeacherId,
        teacher_name: testTeacherName,
        academic_year: '2025-26',
        round: TEST_ROUND,
        stage: originalData.stage,
        lit_stage: originalData.gaps?.lit_stage || originalData.stage,
        num_stage: originalData.gaps?.num_stage || originalData.stage,
        literacy_scores: originalData.literacy_scores || {},
        numeracy_scores: originalData.numeracy_scores || {},
        max_marks: originalData.max_marks || {},
      });
    } else {
      // No original data — zero out the test record so it's not treated as real data
      await axios.post(`${API}/baseline/teacher`, {
        teacher_id: testTeacherId,
        teacher_name: testTeacherName,
        academic_year: '2025-26',
        round: TEST_ROUND,
        stage: 'foundation',
        literacy_scores: {},
        numeracy_scores: {},
        max_marks: {},
      }).catch(() => {});
    }
    console.log(`✅ Cleaned up test data for ${testTeacherName}`);
  });

  test('B1. API: gap calculation is correct for saved test data', async () => {
    const r = await axios.get(`${API}/baseline/teacher/${testTeacherId}?academic_year=2025-26`);
    const assessments: any[] = r.data?.assessments || [];
    const r1 = assessments.find((a: any) => a.round === TEST_ROUND);
    expect(r1).toBeTruthy();

    // Verify percentages
    expect(+r1.literacy_pct.Listening).toBe(20);
    expect(+r1.literacy_pct.Speaking).toBe(10);
    expect(+r1.literacy_pct.Reading).toBe(30);
    expect(+r1.literacy_pct.Writing).toBe(20);
    expect(+r1.numeracy_pct.Operations).toBe(90);
    expect(+r1.numeracy_pct['Base 10']).toBe(80);

    // Gaps (< 60%) should be all 4 literacy domains
    const litGaps = Object.entries(r1.literacy_pct).filter(([, v]: any) => +v < 60);
    const numGaps = Object.entries(r1.numeracy_pct).filter(([, v]: any) => +v < 60);
    expect(litGaps.length).toBe(4);
    expect(numGaps.length).toBe(0);
    console.log(`✅ Gap calculation correct: ${litGaps.length} literacy gaps, ${numGaps.length} numeracy gaps`);
    console.log(`   Literacy gaps: ${litGaps.map(([d,s])=>`${d}=${s}%`).join(', ')}`);
  });

  // Helper: navigate to AI tab and wait for teacher summary to load for testTeacher
  async function goToAIPaperAndSelectTeacher(page: any) {
    await page.click('button:has-text("🤖 AI Assessment Paper")');
    await page.waitForTimeout(500);
    // Find teacher select (has options with teacher names)
    const allSelects = page.locator('select');
    const count = await allSelects.count();
    for (let i = 0; i < count; i++) {
      const opts = await allSelects.nth(i).locator('option').allTextContents();
      if (opts.some((o: string) => o.includes(testTeacherName.split(' ')[0]))) {
        await allSelects.nth(i).selectOption({ label: testTeacherName });
        break;
      }
    }
    // Wait for Teacher Summary section to appear (means API data loaded)
    await expect(page.locator('p').filter({ hasText: 'Teacher Summary' })).toBeVisible({ timeout: 10000 });
  }

  test('B2. UI: Teacher Summary shows correct gap badges before generation', async ({ page }) => {
    await login(page);
    await goToBaseline(page);
    await goToAIPaperAndSelectTeacher(page);

    // All 4 literacy domains should appear as gap badges (⚠️ Literacy–X)
    for (const domain of ['Listening', 'Speaking', 'Reading', 'Writing']) {
      const badge = page.locator('span.bg-orange-100').filter({ hasText: domain });
      const visible = await badge.isVisible().catch(() => false);
      console.log(`  Gap badge for ${domain}: ${visible ? '✅ visible' : '❌ missing'}`);
      expect(visible).toBe(true);
    }

    // Numeracy domains should NOT appear as gaps
    for (const domain of ['Operations', 'Measurement', 'Geometry']) {
      const badge = page.locator('span.bg-orange-100').filter({ hasText: domain });
      const visible = await badge.isVisible().catch(() => false);
      console.log(`  Numeracy ${domain} wrongly in gaps: ${visible}`);
      expect(visible).toBe(false);
    }

    console.log('✅ Teacher Summary shows exactly 4 literacy gap badges, 0 numeracy gaps');
  });

  test('B3. UI: gap percentages in badges are accurate', async ({ page }) => {
    await login(page);
    await goToBaseline(page);
    await goToAIPaperAndSelectTeacher(page);

    // Check specific percentages shown in badges
    const listeningBadge = page.locator('span.bg-orange-100').filter({ hasText: 'Listening' });
    await expect(listeningBadge).toBeVisible({ timeout: 5000 });
    const text = await listeningBadge.textContent();
    expect(text).toContain('20%');
    console.log(`✅ Listening gap badge shows "20%": "${text?.trim()}"`);

    const speakingBadge = page.locator('span.bg-orange-100').filter({ hasText: 'Speaking' });
    const speakingText = await speakingBadge.textContent();
    expect(speakingText).toContain('10%');
    console.log(`✅ Speaking gap badge shows "10%": "${speakingText?.trim()}"`);
  });

  test('B4. UI: Generate button is present; if GROQ key set, paper is gap-targeted', async ({ page }) => {
    test.setTimeout(90000);
    await login(page);
    await goToBaseline(page);
    await goToAIPaperAndSelectTeacher(page);

    const genBtn = page.locator('button').filter({ hasText: /Generate Assessment Paper/ });
    await expect(genBtn).toBeVisible();

    const isDisabled = await genBtn.isDisabled();
    if (isDisabled) {
      const warning = page.locator('text=VITE_GROQ_API_KEY not set');
      const warnVisible = await warning.isVisible().catch(() => false);
      console.log(`⚠️ Generate button disabled — GROQ key not set: ${warnVisible}`);
      // PASS — button renders correctly and gap badges confirmed in B2
      return;
    }

    // GROQ key IS set — generate and verify the paper targets identified gaps
    console.log('🎯 GROQ key available — generating paper...');
    await genBtn.click();

    // Wait for output to appear (up to 60s for AI response)
    const outputBox = page.locator('div.font-mono.whitespace-pre-wrap').first();
    await expect(outputBox).toBeVisible({ timeout: 60000 });
    const paperText = await outputBox.textContent() || '';

    const mentionsListening = paperText.toLowerCase().includes('listening');
    const mentionsSpeaking  = paperText.toLowerCase().includes('speaking');
    const mentionsReading   = paperText.toLowerCase().includes('reading');
    const mentionsWriting   = paperText.toLowerCase().includes('writing');
    const mentionsLiteracy  = paperText.toLowerCase().includes('literacy');

    console.log(`Generated paper mentions: Listening=${mentionsListening}, Speaking=${mentionsSpeaking}, Reading=${mentionsReading}, Writing=${mentionsWriting}, Literacy=${mentionsLiteracy}`);

    // Paper must reference at least one identified gap domain or "literacy"
    expect(mentionsListening || mentionsSpeaking || mentionsReading || mentionsWriting || mentionsLiteracy).toBe(true);

    const dlBtn = page.locator('button:has-text("📥 Download")');
    await expect(dlBtn).toBeVisible();
    console.log('✅ Generated paper is gap-targeted. Download button visible.');
  });

  test('B5. UI: teacher with NO baseline data shows "No baseline data" warning', async ({ page }) => {
    await login(page);
    await goToBaseline(page);
    await page.click('button:has-text("🤖 AI Assessment Paper")');
    await page.waitForTimeout(2000);

    // Find a teacher that has no data by switching to a different year
    // Change academic year to a year with no data
    const yearSelect = page.locator('select').filter({ hasText: '2025-26' }).first();
    await yearSelect.selectOption('2034-35');
    await page.waitForTimeout(2000);

    const warning = page.locator('text=/No baseline data for/');
    await expect(warning).toBeVisible({ timeout: 5000 });
    console.log('✅ "No baseline data" warning shown for year with no data');

    // Restore year
    await yearSelect.selectOption('2025-26');
  });

  test('B6. UI: Individual vs Bulk mode tabs work', async ({ page }) => {
    await login(page);
    await goToBaseline(page);
    await page.click('button:has-text("🤖 AI Assessment Paper")');
    await page.waitForTimeout(1000);

    await expect(page.locator('button:has-text("👤 Individual")')).toBeVisible();
    await expect(page.locator('button:has-text("📦 Bulk (All Teachers)")')).toBeVisible();

    // Switch to Bulk
    await page.click('button:has-text("📦 Bulk")');
    await page.waitForTimeout(500);
    const bulkText = page.locator('text=/Generate All/');
    await expect(bulkText).toBeVisible();
    console.log('✅ Individual and Bulk mode tabs both render correctly');
  });

  test('B7. UI: question type toggles work (MCQ, Short Answer, etc.)', async ({ page }) => {
    await login(page);
    await goToBaseline(page);
    await page.click('button:has-text("🤖 AI Assessment Paper")');
    await page.waitForTimeout(1000);

    const qTypes = ['MCQ', 'Short Answer', 'Long Answer', 'True/False', 'Fill-in-Blank', 'Case-Based'];
    for (const qt of qTypes) {
      const btn = page.locator(`button:has-text("${qt}")`).first();
      await expect(btn).toBeVisible();
    }
    // Toggle off MCQ
    const mcqBtn = page.locator('button:has-text("MCQ")').first();
    const initialClass = await mcqBtn.getAttribute('class');
    await mcqBtn.click();
    const afterClass = await mcqBtn.getAttribute('class');
    expect(afterClass).not.toEqual(initialClass);
    console.log(`✅ Question type toggles work — 6 types available, clicking changes active state`);
  });

  test('B8. UI: Number of questions dropdown has options 5/10/15/20', async ({ page }) => {
    await login(page);
    await goToBaseline(page);
    await page.click('button:has-text("🤖 AI Assessment Paper")');
    await page.waitForTimeout(1000);

    // Find the "Number of Questions" select via its label's parent div
    const numLabel = page.locator('label:has-text("Number of Questions")');
    await expect(numLabel).toBeVisible();
    // Navigate to parent div then find the select within it
    const numSelect = page.locator('div').filter({ has: page.locator('label:has-text("Number of Questions")') }).locator('select');
    const opts = await numSelect.locator('option').allTextContents();
    const numValues = opts.map((s: string) => parseInt(s.trim(), 10)).filter((n: number) => !isNaN(n));
    expect(numValues).toEqual(expect.arrayContaining([5, 10, 15, 20]));
    console.log(`✅ Number of questions options: ${opts.join(', ')}`);
  });

});
