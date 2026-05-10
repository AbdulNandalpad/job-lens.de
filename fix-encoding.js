const fs = require('fs');
const files = [
  'src/app/app/smart-apply/page.tsx',
  'src/app/app/career-scan/page.tsx',
  'src/app/app/cv-builder/page.tsx',
  'src/app/app/cover-letter/page.tsx',
  'src/app/app/apply-now/page.tsx',
  'src/app/app/tracker/page.tsx',
];

files.forEach(f => {
  let c = fs.readFileSync(f, 'latin1');
  c = c
    .replace(/\u00e2\u0080\u0094/g, '-')
    .replace(/\u00e2\u0080\u0093/g, '-')
    .replace(/\u00c2\u00b7/g, '·')
    .replace(/\u00e2\u009c\u0093/g, 'v')
    .replace(/\u00e2\u0086\u0092/g, '->')
    .replace(/\u00e2\u0086\u0093/g, 'v')
    .replace(/\u00e2\u009a\u00a0/g, '!')
    .replace(/\u00e2\u009a\u00a1/g, '')
    .replace(/\u00e2\u009c\u0089/g, '')
    .replace(/\u00e2\u0080\u0099/g, "'")
    .replace(/\u00e2\u0080\u009c/g, '"')
    .replace(/\u00e2\u0080\u009d/g, '"')
    .replace(/\u00e2\u0097\u008e/g, 'o')
    .replace(/\u00c3\u00b0\u00c5\u00b8\u017d\u00af/g, '')
    .replace(/\u00c3\u00b0\u00c5\u00b8\u201d/g, '');
  fs.writeFileSync(f, c, 'utf8');
  console.log('Cleaned: ' + f);
});
console.log('Done');