# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-appraisal-import.spec.ts >> E2E — Appraisal Excel Import (comprehensive) >> 1. Import Excel button is visible in filter bar
- Location: tests\e2e-appraisal-import.spec.ts:130:3

# Error details

```
Error: page.goto: net::ERR_INTERNET_DISCONNECTED at https://cbas-frontend.onrender.com/
Call log:
  - navigating to "https://cbas-frontend.onrender.com/", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e5]:
    - heading "Tap the dino or press space to play" [level=1] [ref=e6]
    - generic [ref=e7]:
      - paragraph [ref=e8]: "Try:"
      - list [ref=e9]:
        - listitem [ref=e10]: Checking the network cables, modem, and router
        - listitem [ref=e11]: Reconnecting to Wi-Fi
        - listitem [ref=e12]:
          - link "Running Windows Network Diagnostics" [ref=e13] [cursor=pointer]:
            - /url: javascript:diagnoseErrors()
    - generic [ref=e14]: ERR_INTERNET_DISCONNECTED
  - application "Dino game, tap the dino or press space to play" [ref=e16]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import axios from 'axios';
  3   | import * as XLSX from 'xlsx';
  4   | import * as fs from 'fs';
  5   | import * as os from 'os';
  6   | import * as path from 'path';
  7   | 
  8   | const BASE = 'https://cbas-frontend.onrender.com';
  9   | const API  = 'https://cbas-backend-bxiu.onrender.com';
  10  | const ADMIN_EMAIL    = 'garkaswetha@gmail.com';
  11  | const ADMIN_PASSWORD = 'swetha123';
  12  | const YEAR = '2025-26';
  13  | 
  14  | const NURSERY_GRADES = ['Pre-KG', 'LKG', 'UKG', 'Nursery'];
  15  | 
  16  | function isNursery(assigned_classes: string[]): boolean {
  17  |   return assigned_classes?.length > 0 && assigned_classes.every((c: string) => NURSERY_GRADES.includes(c));
  18  | }
  19  | 
  20  | async function login(page: any) {
> 21  |   await page.goto(BASE, { timeout: 90000 });
      |              ^ Error: page.goto: net::ERR_INTERNET_DISCONNECTED at https://cbas-frontend.onrender.com/
  22  |   await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  23  |   await page.fill('input[type="email"]', ADMIN_EMAIL);
  24  |   await page.fill('input[type="password"]', ADMIN_PASSWORD);
  25  |   await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
  26  |   // Wait for admin dashboard nav to confirm login succeeded (backend may need 30-60s cold start)
  27  |   await page.waitForSelector(
  28  |     'a:has-text("Teachers Appraisal"), a[href*="appraisal"]',
  29  |     { timeout: 60000 }
  30  |   );
  31  | }
  32  | 
  33  | async function goToAppraisal(page: any) {
  34  |   await page.click('a:has-text("Teachers Appraisal"), a[href*="appraisal"]');
  35  |   await page.waitForSelector('table', { timeout: 20000 });
  36  |   await page.waitForFunction(() => document.querySelectorAll('tbody tr').length > 1, {}, { timeout: 25000 });
  37  | }
  38  | 
  39  | async function openImportPanel(page: any) {
  40  |   const importBtn = page.locator('button:has-text("Import Excel")');
  41  |   await expect(importBtn).toBeVisible();
  42  |   await importBtn.click();
  43  |   await expect(page.locator('h3:has-text("Import Appraisals from Excel")')).toBeVisible({ timeout: 5000 });
  44  | }
  45  | 
  46  | async function apiAppraisals() {
  47  |   const res = await axios.get(`${API}/appraisal?academic_year=${YEAR}`);
  48  |   return res.data as any[];
  49  | }
  50  | 
  51  | async function teacherByName(name: string) {
  52  |   const all = await apiAppraisals();
  53  |   return all.find((t: any) => t.teacher_name === name);
  54  | }
  55  | 
  56  | // Creates a temp XLSX file and returns its path; caller must delete
  57  | function createXlsx(g1Rows: any[], nursRows: any[]): string {
  58  |   const wb = XLSX.utils.book_new();
  59  |   const ws1 = XLSX.utils.json_to_sheet(g1Rows.length > 0 ? g1Rows : [{ 'Teacher Name': '' }]);
  60  |   XLSX.utils.book_append_sheet(wb, ws1, 'Grade1+ Teachers');
  61  |   const ws2 = XLSX.utils.json_to_sheet(nursRows.length > 0 ? nursRows : [{ 'Teacher Name': '' }]);
  62  |   XLSX.utils.book_append_sheet(wb, ws2, 'Nursery Teachers');
  63  |   const p = path.join(os.tmpdir(), `appraisal_import_e2e_${Date.now()}.xlsx`);
  64  |   XLSX.writeFile(wb, p);
  65  |   return p;
  66  | }
  67  | 
  68  | function makeG1Row(name: string, overrides: Record<string, any> = {}) {
  69  |   return {
  70  |     'Teacher Name': name,
  71  |     'PA1': 75, 'PA2': 80, 'PA3': 70, 'PA4': 65, 'SA1': 85, 'SA2': 90,
  72  |     'Workshops': '3',       // → ATTENDED 21 TO 40:- 1.5 MARKS
  73  |     'Training': '1',        // → CONDUCTED 1 TRAINING:- 1 MARK
  74  |     'Books Read': '2',      // → 6 TO 8:- 1.5 MARKS
  75  |     'Articles': '1',        // → 1 TO 2:- 1 MARK
  76  |     'Strategies': '1',      // → 1 TO 2:- 1 MARK
  77  |     'Team Work': '2',       // → HIGHLY CO-OPERATIVE: 2 MARKS
  78  |     'Attitude': '1',        // → SOMETIMES RESPECTFUL & FAIR:- 1 MARK
  79  |     'Commitment': '2',      // → FULLY COMMITTED & ACTIVELY PROMOTES SCHOOL VALUES:- 2 MARKS
  80  |     'Adaptability': '1',    // → GENERALLY ADAPTABLE & FLEXIBLE:- 1 MARK
  81  |     'Dressing': '2',        // → ALWAYS CLEAN, NEAT & WELL PRESENTED PROFESSIONALLY:- 2 MARKS
  82  |     'Parents Feedback': '2',    // → BELOW 5:- 8%
  83  |     'Classroom': '3',           // → 16 TO 19:- 8 MARKS
  84  |     'English Comm': '2',        // → BELOW 5:- 8%
  85  |     'Phonics': 'Y', 'Math': 'N', 'Reading': 'Y', 'Handwriting': 'N',
  86  |     'Kannada Reading': 'N', 'Notes/HW': 'Y', 'Library': 'N',
  87  |     'Parental Engagement': 'N', 'Below A Students': 'N',
  88  |     'English Grammar': 'N', 'Others': 'N',
  89  |     'Committee Role': 'NONE',
  90  |     'Committee Name': '',
  91  |     ...overrides,
  92  |   };
  93  | }
  94  | 
  95  | function makeNursRow(name: string, overrides: Record<string, any> = {}) {
  96  |   return {
  97  |     'Teacher Name': name,
  98  |     'Literacy Band': 'G',     // → REGULAR LITERACY PRACTICE USING STORIES, SONGS & WRITING - GOOD - 3
  99  |     'Numeracy Band': 'E',     // → HANDS ON NUMBER CONCEPTS (COUNTING, PATTERNS, ETC) - EXCELLENT - 5 MARKS
  100 |     'Workshops': '4',         // → ATTENDED 41 TO 50:- 2 MARKS
  101 |     'Training': '2',          // → CONDUCTED 2 TRAINING:- 2 MARKS
  102 |     'Books Read': '3',        // → 8 & ABOVE:- 2 MARKS
  103 |     'Articles': '2',          // → 2 & ABOVE:- 2 MARKS
  104 |     'Strategies': '2',        // → 2 & ABOVE:- 2 MARKS
  105 |     'Team Work': '2',         // → HIGHLY CO-OPERATIVE: 2 MARKS
  106 |     'Attitude': '2',          // → RESPECTFUL & FAIR TOWARDS STUDENTS:- 2 MARKS
  107 |     'Commitment': '1',        // → GENERALLY COMMITTED & SUPPORTS SCHOOL VALUES:- 1 MARK
  108 |     'Adaptability': '1',      // → GENERALLY ADAPTABLE & FLEXIBLE:- 1 MARK
  109 |     'Dressing': '2',          // → ALWAYS CLEAN, NEAT & WELL PRESENTED PROFESSIONALLY:- 2 MARKS
  110 |     'Parents Feedback': '1',  // → BELOW 3:- 10%
  111 |     'Classroom': '4',         // → 20 & ABOVE:- 10 MARKS
  112 |     'English Comm': '1',      // → BELOW 3:- 10%
  113 |     'Phonics': 'Y', 'Math': 'Y', 'Reading': 'N', 'Handwriting': 'N',
  114 |     'Kannada Reading': 'N', 'Notes/HW': 'N', 'Library': 'N',
  115 |     'Parental Engagement': 'N', 'Below A Students': 'N',
  116 |     'English Grammar': 'N', 'Others': 'N',
  117 |     'Committee Role': 'LEAD',
  118 |     'Committee Name': 'E2E Committee',
  119 |     ...overrides,
  120 |   };
  121 | }
```