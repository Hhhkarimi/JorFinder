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
  /(?:^|[^\p{Script=Arabic}])بی\s+ن(?:\s*|‌)رشت/u,
  /(?:روا ن|سیاس ت|پژوه ش|رو ش|زبا ن|حوز ه|رشت ه|حرف ه|داد ه|برنام ه|محی ط|دیدگا ه|فناور ی|نظری هها|دانشگا ه)/u,
  /[\p{Script=Arabic}\u200c]+\s+[ابتثجچحخدذرزژسشصضطظعغفقکگلمنوهی](?:ها|های)(?:$|[^\p{Script=Arabic}])/u,
  /[\p{Script=Arabic}\u200c]+\s+[هی](?:تر|تری|ترین)(?:$|[^\p{Script=Arabic}])/u,
  /[\p{Script=Arabic}\u200c]+\s+(?:هاند|ی(?:شده|سازی|مند)|[بدمهنسشتج](?:شناسی|سنجی|گیری|سازی))(?:$|[^\p{Script=Arabic}])/u,
  /(?:زیبای یشناسی|جامع هشناختی|عالق همند|چش مانداز|روزنام هنگاری|تاری خنگاری|قو منگاری|زیس تمحیطی|اطال عرسانی|بی نفرهنگی|طبق هبندی|دان شآموز|کس بوکار|ب هویژه|ب هکار|اشترا کگذاری|منعک سکننده)/u,
  /(?:تحلی ل|کتا ب|زیبای ی|دان ش(?:پژوه|محور|بنیان)|اطال ع(?:سنج|یاب)|چارچو ببند|ثب تشده)/u,
  /(?:^|[^\p{Script=Arabic}])ن?می\s+(?:کند|کنند|شود|شوند|دهد|دهند|گیرد|گیرند|پردازد|پردازند|تواند|توانند|یابد|یابند)(?:$|[^\p{Script=Arabic}])/u,
];
const failures = [];
for (const record of records) for (const field of fields) {
  const value = String(record[field] || '');
  if (patterns.some(pattern => pattern.test(value))) failures.push({ id: record.record_id, field, value: value.slice(0, 180) });
}
assert.deepEqual(failures.slice(0, 10), [], `${failures.length} Persian fields still contain extraction spacing artifacts`);
console.log('Published Persian scope and aims text has no known spacing artifacts: OK');
