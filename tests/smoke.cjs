// Small dependency-free integration check for the static catalogue.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/catalog-manifest.json'), 'utf8'));
const font = fs.readFileSync(path.join(root, 'assets/fonts/Vazirmatn.woff2'));
assert.equal(font.subarray(0, 4).toString(), 'wOF2');
const sourceTitle = fs.readFileSync(path.join(root, 'assets/source-title-page.png'));
assert.equal(sourceTitle.subarray(1, 4).toString(), 'PNG');
assert.equal(sourceTitle.readUInt32BE(16), 794);
assert.equal(sourceTitle.readUInt32BE(20), 486);
assert.match(css, /font-family:\s*Vazirmatn/);
assert.match(html, /src="\.\/assets\/source-title-page\.png" alt="نشان دانشگاه شهید چمران اهواز/);
assert.match(html, /آتوسا کوچکی/);
assert.match(html, /میترا فلاحی/);
assert.match(html, /حسین کریمی/);
assert.match(html, /https:\/\/www\.linkedin\.com\/in\/hossein-karimi-8a452153\//);

const elements = new Map();
function element(key) {
  if (!elements.has(key)) elements.set(key, {
    id: key.startsWith('#') ? key.slice(1) : '', value: '', hidden: false, disabled: false, innerHTML: '', textContent: '',
    dataset: {}, isConnected: true, listeners: {}, open: false, attributes: {},
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener(name, fn) { this.listeners[name] = fn; },
    setAttribute(name, value) { this.attributes[name] = value; }, removeAttribute(name) { delete this.attributes[name]; }, append() {}, add() {}, focus() {}, scrollIntoView() {},
    closest() { return this; },
    querySelector() { return { addEventListener() {} }; }, querySelectorAll() { return []; },
    showModal() { this.open = true; }, close() { this.open = false; },
  });
  return elements.get(key);
}

const events = {};
element('#tab-catalog').dataset.workspace = 'catalog';
element('#tab-recommender').dataset.workspace = 'recommender';
element('#workspace-tabs').querySelectorAll = () => [element('#tab-catalog'), element('#tab-recommender')];
const location = { hash: '', pathname: '/', search: '' };
const sandbox = {
  window: { DecompressionStream, addEventListener(name, fn) { events[name] = fn; } },
  document: { addEventListener() {}, querySelector: element, querySelectorAll: () => [], createElement: () => element('created') },
  Option: class {}, Intl, Blob, Response, DecompressionStream, Uint8Array, TextEncoder,
  atob, URL, crypto: webcrypto, console, setTimeout, clearTimeout,
  history: { replaceState(_state, _title, path) { location.hash = path.startsWith('#') ? path : ''; }, pushState(_state, _title, path) { location.hash = path; } }, location,
  // Simulates browsers where storage is blocked. The catalogue should still work.
  localStorage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } },
  fetch: async url => {
    const file = path.join(root, url.split('?')[0].replace(/^\.\//, ''));
    const exists = fs.existsSync(file);
    return {
      ok: exists, status: exists ? 200 : 404,
      json: async () => JSON.parse(fs.readFileSync(file, 'utf8')),
      text: async () => fs.readFileSync(file, 'utf8'),
    };
  },
};
vm.createContext(sandbox);
element('#recommend-submit').disabled = true;
vm.runInContext(fs.readFileSync(path.join(root, 'recommender.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), sandbox);

async function waitForCatalogue() {
  for (let i = 0; i < 100; i++) {
    if (element('#results-heading').textContent.includes('۹۷۰')) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw Error('The complete catalogue did not render');
}

waitForCatalogue().then(async () => {
  for (let i = 0; element('#recommend-submit').disabled && i < 100; i++) {
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.equal(element('#recommend-submit').disabled, false);
  assert.equal(manifest.records, 971);
  assert.equal(manifest.journals, 970);
  assert.match(element('#results').innerHTML, /Teaching and Teacher Education/);
  assert.equal(element('#export-data').disabled, false);
  vm.runInContext('showJournal(1)', sandbox);
  assert.match(element('#dialog-content').innerHTML, /یک مجله بین المللی/);
  vm.runInContext('closeJournal()', sandbox);
  element('#workspace-tabs').listeners.click({ target: element('#tab-recommender') });
  assert.equal(element('#catalog').hidden, true);
  assert.equal(element('#recommender').hidden, false);
  assert.equal(element('#tab-recommender').attributes['aria-selected'], 'true');
  assert.equal(location.hash, '#recommender');
  vm.runInContext('showJournal(1)', sandbox);
  assert.equal(location.hash, '#journal-1');
  vm.runInContext('closeJournal()', sandbox);
  assert.equal(location.hash, '#recommender');
  element('#workspace-tabs').listeners.keydown({ target: element('#tab-recommender'), key: 'ArrowRight', preventDefault() {} });
  assert.equal(element('#catalog').hidden, false);
  assert.equal(element('#recommender').hidden, true);
  element('#workspace-tabs').listeners.click({ target: element('#tab-recommender') });
  location.hash = '#catalog';
  events.hashchange();
  assert.equal(element('#recommender').hidden, true);
  location.hash = '#recommender';
  events.hashchange();
  assert.equal(element('#recommender').hidden, false);
  element('#link-filter').value = 'direct';
  element('#link-filter').listeners.change({ target: element('#link-filter') });
  assert.match(element('#results-heading').textContent, /۲۷ نشریه/);
  element('#paper-title').value = 'هوش مصنوعی در آموزش معلمان';
  element('#paper-abstract').value = 'پژوهش دربارهٔ کاربرد فناوری آموزشی و یادگیری ماشین برای تربیت معلمان و بهبود یادگیری دانشجویان است.';
  element('#paper-keywords').value = '  ';
  element('#recommend-form').listeners.submit({ preventDefault() {} });
  assert.equal(element('#paper-keywords').attributes['aria-invalid'], 'true');
  assert.equal(element('#paper-keywords-error').hidden, false);
  element('#paper-keywords').value = 'آموزش، فناوری، هوش مصنوعی';
  element('#recommend-form').listeners.input({ target: element('#paper-keywords') });
  assert.equal(element('#paper-keywords-error').hidden, true);
  element('#recommend-form').listeners.submit({ preventDefault() {} });
  assert.equal(element('#recommend-results').hidden, false);
  assert.match(element('#recommend-list').innerHTML, /مبنای پیشنهاد/);
  assert.doesNotMatch(element('#recommend-list').innerHTML, /درصد تطابق|تطابق محتوایی|٪/);
  assert.match(element('#recommend-status').textContent, /نشریهٔ متمایز/);
  element('#favorites-only').listeners.click();
  assert.equal(element('#catalog').hidden, false);
  assert.equal(location.hash, '#catalog');
  vm.runInContext('toggleFavorite(1)', sandbox);
  assert.ok(events.hashchange);
  console.log('Catalogue, recommendations, university logo, source credits, font, checksum and blocked storage: OK');
}).catch(error => { console.error(error); process.exitCode = 1; });
