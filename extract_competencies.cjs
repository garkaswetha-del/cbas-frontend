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
files.forEach(f => {
  const wb = XLSX.readFile(dir + '\\' + f);
  console.log('\n=== ' + f + ' ===');
  wb.SheetNames.forEach(sn => {
    const ws = wb.Sheets[sn];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const hdr = (rows[0] || []).map(h => String(h).replace(/\n/g,' ').trim()).filter(Boolean);
    console.log('  [' + sn + '] ' + JSON.stringify(hdr));
  });
});
