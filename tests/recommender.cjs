const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { createRecommender } = require('../recommender');

const data = path.resolve(__dirname, '../data');
const manifest = JSON.parse(fs.readFileSync(path.join(data, 'catalog-manifest.json'), 'utf8'));
const packed = Array.from({ length: manifest.parts }, (_, i) =>
  fs.readFileSync(path.join(data, `catalog-${String(i).padStart(2, '0')}.txt`), 'ascii')
).join('');
const journals = JSON.parse(zlib.gunzipSync(Buffer.from(packed, 'base64')));
const engine = createRecommender(journals);

const persian = engine.recommend({
  title: 'کاربرد هوش مصنوعی در آموزش معلمان',
  abstract: 'بررسی تاثیر یادگیری ماشین و فناوری آموزشی در تربیت معلمان و بهبود یادگیری دانشجویان',
  keywords: 'هوش مصنوعی، آموزش، تربیت معلم',
});
assert.ok(persian.length > 0);
assert.ok(persian.some(result => result.journal.subject_fa === 'آموزش'));
assert.ok(persian.every((result, i) => result.score >= 10 && result.score <= 99 && (i === 0 || persian[i - 1].score >= result.score)));
assert.equal(new Set(persian.map(result => result.journal.journal_title)).size, persian.length);

const english = engine.recommend({
  title: 'Artificial intelligence in teacher education',
  abstract: 'Using digital learning analytics for teacher training and educational technology',
  keywords: 'teacher education, learning analytics, AI',
});
assert.ok(english.some(result => ['آموزش', 'علوم تربیتی'].includes(result.journal.subject_fa)));
assert.deepEqual(engine.recommend({
  title: 'Quasar neutrinos in astrophysics',
  abstract: 'High energy particle collisions and spectroscopy',
  keywords: 'astrophysics, neutrinos',
}), []);
console.log('Persian/English ranking, de-duplication and out-of-scope query: OK');
