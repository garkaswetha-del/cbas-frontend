const XLSX = require('xlsx');
const dir = "C:\\Users\\Swetha Garka\\Downloads\\Student competencies-20260512T055452Z-3-001\\Student competencies\\Competencies";
const files = [
  'Arts Competencies.xlsx',
  'Foundation competencies.xlsx',
  'Hindi Competencies.xlsx',
  'Interdisciplinary Competencies.xlsx',
  'Kannada Competencies.xlsx',
  'Language Competencies.xlsx',
  'Numeracy Competencies.xlsx',
  'Physical Education Competencies.xlsx',
  'Science Competencies.xlsx',
  'Social Social Competencies.xlsx',
  'Vocational Education Competencies.xlsx',
];

const SKIP_COLS = ['Grade','Curricular goals','Curricular Goals','Competencies','Competencies (NCF)','Assessment Mode'];

files.forEach(f => {
  const wb = XLSX.readFile(dir + '\\' + f);
  console.log('\n### ' + f.replace(' Competencies.xlsx','').replace(' competencies.xlsx','') + ' ###');
  wb.SheetNames.forEach(sn => {
    const ws = wb.Sheets[sn];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    // Find the real domain header row (row with domain-like columns, not just one long cell)
    let domainRow = null;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const r = rows[i];
      const cleaned = r.map(h => String(h).replace(/\n/g,' ').trim()).filter(h => h && !SKIP_COLS.includes(h));
      if (cleaned.length >= 2 && !cleaned[0].includes('Assessment Mode')) {
        domainRow = cleaned;
        break;
      }
    }
    if (!domainRow) {
      // Try row 1
      const r = rows[1] || [];
      domainRow = r.map(h => String(h).replace(/\n/g,' ').trim()).filter(h => h && !SKIP_COLS.includes(h));
    }
    const domains = domainRow.filter(d => !d.includes('Assessment Mode') && !d.startsWith('CG'));
    console.log('  Stage: ' + sn);
    console.log('  Domains: ' + domains.join(' | '));
  });
});
