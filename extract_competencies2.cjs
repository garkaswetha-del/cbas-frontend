const XLSX = require('xlsx');
const dir = "C:\\Users\\Swetha Garka\\Downloads\\Student competencies-20260512T055452Z-3-001\\Student competencies\\Competencies";

// Language and Numeracy have merged header cells — look at rows 0-4
['Language Competencies.xlsx','Numeracy Competencies.xlsx'].forEach(f => {
  const wb = XLSX.readFile(dir + '\\' + f);
  console.log('\n=== ' + f + ' ===');
  wb.SheetNames.forEach(sn => {
    const ws = wb.Sheets[sn];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    console.log('  SHEET: ' + sn);
    rows.slice(0, 6).forEach((r, i) => {
      const clean = r.map(h => String(h).replace(/\n/g,' ').trim()).filter(Boolean);
      if (clean.length) console.log('    row' + i + ': ' + JSON.stringify(clean));
    });
  });
});
