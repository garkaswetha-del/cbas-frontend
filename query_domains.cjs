const https = require('https');
const API = 'cbas-backend-production.up.railway.app';

function get(path) {
  return new Promise((resolve, reject) => {
    https.get({ hostname: API, path, headers: { 'Accept': 'application/json' } }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve([]); } });
    }).on('error', reject);
  });
}

async function main() {
  // Get stats first
  const stats = await get('/activities/competencies/stats');
  console.log('=== SUBJECTS IN APP ===');
  (stats.bySubject || []).forEach(s => console.log('  ' + s.subject + ': ' + s.count + ' competencies'));

  // Get all competencies and extract unique domains per subject
  const subjects = ['language','numeracy','science','social_science','arts','foundation','physical_education','hindi','kannada','vocational_education','interdisciplinary'];
  console.log('\n=== DOMAINS PER SUBJECT (from DB) ===');
  for (const subj of subjects) {
    const comps = await get('/activities/competencies?subject=' + subj);
    const arr = Array.isArray(comps) ? comps : (comps.competencies || []);
    const domains = [...new Set(arr.map(c => c.domain).filter(Boolean))].sort();
    console.log('\n[' + subj + '] (' + arr.length + ' competencies)');
    domains.forEach(d => console.log('  - ' + d));
  }
}
main().catch(console.error);
