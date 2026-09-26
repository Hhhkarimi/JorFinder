const assert = require('node:assert/strict');
const { normalize, prepareJournals, filterAndSort } = require('../catalog-core');

const journals = prepareJournals([
  { record_id: 3, record_type: 'journal', journal_title: 'Beta', publisher: 'ناشر ب', subject_fa: 'آموزش', subject_en: 'Education', index_quartile: 'Q2', acceptance_rate_percent: null, aims_and_scope_fa: '' },
  { record_id: 1, record_type: 'journal', journal_title: 'Alpha', publisher: 'ناشر الف', subject_fa: 'روان‌شناسی', subject_en: 'Psychology', index_quartile: 'Q1', acceptance_rate_percent: 18, submission_to_first_decision_days: 30, iranian_author_count: 2, aims_and_scope_fa: 'رفتار و یادگیری' },
  { record_id: 2, record_type: 'journal', journal_title: 'Gamma', publisher: 'ناشر الف', subject_fa: 'آموزش', subject_en: 'Education', index_quartile: 'اعلام نشده', acceptance_rate_percent: 35, submission_to_first_decision_days: 10, iranian_author_count: 8, aims_and_scope_fa: 'فناوری آموزشی' },
  { record_id: 4, record_type: 'note', journal_title: 'یادداشت منبع' },
]);

assert.equal(normalize('يادگيري‌ ماشينِ'), 'یادگیری ماشین');
assert.deepEqual(filterAndSort(journals).map(j => j.record_id), [1, 2, 3]);
assert.deepEqual(filterAndSort(journals, { query: 'فناوري آموزشي' }).map(j => j.record_id), [2]);
assert.deepEqual(filterAndSort(journals, { subject: 'آموزش', sort: 'acceptance' }).map(j => j.record_id), [2, 3]);
assert.deepEqual(filterAndSort(journals, { quartile: 'نامشخص' }).map(j => j.record_id), [2]);
assert.deepEqual(filterAndSort(journals, { acceptanceBand: 'lt20' }).map(j => j.record_id), [1]);
assert.deepEqual(filterAndSort(journals, { availability: 'aims', sort: 'decision' }).map(j => j.record_id), [2, 1]);
assert.deepEqual(filterAndSort(journals, { favoritesOnly: true }, { favorites: new Set([3]) }).map(j => j.record_id), [3]);
assert.deepEqual(filterAndSort(journals, { linkStatus: 'direct' }, { linkType: j => j.record_id === 2 ? 'direct' : 'search' }).map(j => j.record_id), [2]);
assert.deepEqual(journals.map(j => j.record_id), [3, 1, 2, 4], 'filtering must not mutate the prepared catalogue');

console.log('Catalogue normalization, filtering, sorting and immutability: OK');
