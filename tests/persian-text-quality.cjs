const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const data = path.resolve(__dirname, '../data');
const manifest = JSON.parse(fs.readFileSync(path.join(data, 'catalog-manifest.json'), 'utf8'));
const packed = Array.from({ length: manifest.parts }, (_, i) =>
  fs.readFileSync(path.join(data, `catalog-${String(i).padStart(2, '0')}.txt`), 'ascii')
).join('');
const records = JSON.parse(zlib.gunzipSync(Buffer.from(packed, 'base64')));
const fields = ['coverage_scope_fa', 'aims_and_scope_fa'];
const patterns = [
  /(?:^|[^\p{Script=Arabic}])(?:نم\s+ی|م\s+ی)(?=\S)/u,
  /(?:^|[^\p{Script=Arabic}])بی\s+نالملل/u,
  /(?:روا ن|سیاس ت|پژوه ش|رو ش|زبا ن|حوز ه|رشت ه|حرف ه|داد ه|برنام ه|محی ط|دیدگا ه|فناور ی|نظری ه|دانشگا ه)/u,
];
const failures = [];
for (const record of records) for (const field of fields) {
  const value = String(record[field] || '');
  if (patterns.some(pattern => pattern.test(value))) failures.push({ id: record.record_id, field, value: value.slice(0, 180) });
}
assert.deepEqual(failures.slice(0, 10), [], `${failures.length} Persian fields still contain extraction spacing artifacts`);
console.log('Published Persian scope and aims text has no known spacing artifacts: OK');
