const PAGE_SIZE = 18;
const FALLBACK_PACK_COUNT = 4;
const MAX_COMPARE = 4;

const state = {
  journals: [],
  filtered: [],
  query: "",
  subject: "",
  quartile: "",
  publisher: "",
  availability: "",
  acceptanceBand: "",
  sort: "source",
  page: 1,
  view: localStorage.getItem("jorfinder:view") || "grid",
  favoritesOnly: false,
  favorites: new Set(JSON.parse(localStorage.getItem("jorfinder:favorites") || "[]")),
  compare: new Set(),
};

const els = {
  search: document.querySelector("#search"),
  subject: document.querySelector("#subject-filter"),
  quartile: document.querySelector("#quartile-filter"),
  publisher: document.querySelector("#publisher-filter"),
  availability: document.querySelector("#data-filter"),
  acceptanceBand: document.querySelector("#acceptance-filter"),
  sort: document.querySelector("#sort-filter"),
  results: document.querySelector("#results"),
  heading: document.querySelector("#results-heading"),
  loading: document.querySelector("#loading"),
  error: document.querySelector("#error-state"),
  empty: document.querySelector("#empty-state"),
  clear: document.querySelector("#clear-filters"),
  pagination: document.querySelector("#pagination"),
  next: document.querySelector("#next-page"),
  prev: document.querySelector("#prev-page"),
  pageIndicator: document.querySelector("#page-indicator"),
  dialog: document.querySelector("#journal-dialog"),
  dialogContent: document.querySelector("#dialog-content"),
  dialogClose: document.querySelector("#close-dialog"),
  compareDialog: document.querySelector("#compare-dialog"),
  compareContent: document.querySelector("#compare-content"),
  compareClose: document.querySelector("#close-compare"),
  compareTray: document.querySelector("#compare-tray"),
  compareLabel: document.querySelector("#compare-label"),
  compareCount: document.querySelector("#compare-count"),
  compareShow: document.querySelector("#compare-show"),
  compareOpen: document.querySelector("#compare-open"),
  compareClear: document.querySelector("#compare-clear"),
  favoritesOnly: document.querySelector("#favorites-only"),
  favoriteCount: document.querySelector("#favorite-count"),
  statTotal: document.querySelector("#stat-total"),
  statSubjects: document.querySelector("#stat-subjects"),
  statAims: document.querySelector("#stat-aims"),
  statDecision: document.querySelector("#stat-decision"),
};

const faNumber = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
const collatorFa = new Intl.Collator("fa", { sensitivity: "base" });
const collatorEn = new Intl.Collator("en", { sensitivity: "base" });

const DIRECT_URLS = new Map([
  ["Teaching and Teacher Education", "https://www.sciencedirect.com/journal/teaching-and-teacher-education"],
  ["Computers & Education", "https://www.sciencedirect.com/journal/computers-and-education"],
  ["Educational Research Review", "https://www.sciencedirect.com/journal/educational-research-review"],
  ["Journal of Literary Studies", "https://www.tandfonline.com/journals/rjls20"],
  ["Journal of Information Studies & Technology", "https://www.qscience.com/content/journals/jist"],
  ["Journal of Contemporary Painting", "https://www.intellectbooks.com/journal-of-contemporary-painting"],
]);

const PUBLISHER_DOMAINS = [
  [/elsevier/i, "sciencedirect.com"],
  [/taylor|francis|routledge/i, "tandfonline.com"],
  [/wiley/i, "onlinelibrary.wiley.com"],
  [/sage/i, "journals.sagepub.com"],
  [/springer/i, "link.springer.com"],
  [/emerald/i, "emerald.com"],
  [/oxford|oup/i, "academic.oup.com"],
  [/cambridge/i, "cambridge.org"],
  [/brill/i, "brill.com"],
  [/de gruyter/i, "degruyter.com"],
  [/intellect/i, "intellectbooks.com"],
  [/mdpi/i, "mdpi.com"],
  [/mit press/i, "direct.mit.edu"],
  [/duke university/i, "read.dukeupress.edu"],
  [/university of chicago/i, "journals.uchicago.edu"],
  [/johns hopkins/i, "muse.jhu.edu"],
  [/penn state/i, "scholarlypublishingcollective.org"],
  [/american psychological|\bapa\b/i, "apa.org"],
  [/annual reviews/i, "annualreviews.org"],
  [/karger/i, "karger.com"],
  [/world scientific/i, "worldscientific.com"],
  [/igi global/i, "igi-global.com"],
  [/university of hawaii/i, "uhpress.hawaii.edu"],
  [/university of illinois/i, "press.uillinois.edu"],
  [/university of pennsylvania/i, "pennpress.org"],
  [/university of westminster/i, "uwestminsterpress.co.uk"],
  [/tehran/i, "ut.ac.ir"],
  [/brieflands/i, "brieflands.com"],
  [/qscience|hamad bin khalifa/i, "qscience.com"],
];

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[char]);
}

function hasNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function num(value, suffix = "") {
  return hasNumber(value) ? `${faNumber.format(value)}${suffix}` : "—";
}

function textOrDash(value) {
  const text = String(value ?? "").trim();
  return text || "—";
}

function clampText(value, max = 165) {
  const text = String(value || "").trim();
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

function quartileLabel(value) {
  const text = String(value || "").trim();
  return text && text !== "اعلام نشده" ? text : "نامشخص";
}

function rawMetric(journal, rawKey, numericKey, numericSuffix = "") {
  const raw = String(journal[rawKey] ?? "").trim();
  if (raw) return raw;
  return hasNumber(journal[numericKey]) ? `${faNumber.format(journal[numericKey])}${numericSuffix}` : "—";
}

function buildSearchText(journal) {
  return normalize([
    journal.journal_title,
    journal.publisher,
    journal.subject_fa,
    journal.subject_en,
    journal.index_quartile,
    journal.coverage_scope_fa,
    journal.aims_and_scope_fa,
    journal.data_corrections,
    journal.acceptance_rate_raw,
    journal.iranian_authors_raw,
    journal.submission_to_acceptance_raw,
    journal.submission_to_first_decision_raw,
  ].join(" "));
}

function externalLinkFor(journal) {
  const direct = DIRECT_URLS.get(journal.journal_title);
  if (direct) return { url: direct, type: "direct", label: "صفحه مستقیم مجله" };

  const publisher = journal.publisher || "";
  const domain = PUBLISHER_DOMAINS.find(([pattern]) => pattern.test(publisher))?.[1];
  const phrase = `"${journal.journal_title}"`;
  if (domain) {
    return {
      url: `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} ${phrase}`)}`,
      type: "publisher-search",
      label: "جست‌وجو در سایت ناشر",
    };
  }
  return {
    url: `https://www.google.com/search?q=${encodeURIComponent(`${phrase} "${publisher}" journal`)}`,
    type: "web-search",
    label: "یافتن صفحه مجله",
  };
}

function registryLinkFor(journal) {
  return `https://www.google.com/search?q=${encodeURIComponent(`site:portal.issn.org "${journal.journal_title}"`)}`;
}

function populateFilters() {
  const subjectCounts = new Map();
  const quartileCounts = new Map();
  const publisherCounts = new Map();

  for (const journal of state.journals) {
    if (journal.subject_fa) subjectCounts.set(journal.subject_fa, (subjectCounts.get(journal.subject_fa) || 0) + 1);
    const q = quartileLabel(journal.index_quartile);
    quartileCounts.set(q, (quartileCounts.get(q) || 0) + 1);
    if (journal.publisher) publisherCounts.set(journal.publisher, (publisherCounts.get(journal.publisher) || 0) + 1);
  }

  [...subjectCounts.entries()].sort((a,b) => collatorFa.compare(a[0],b[0])).forEach(([label,count]) => {
    els.subject.add(new Option(`${label} — ${faNumber.format(count)}`, label));
  });

  [...quartileCounts.entries()].sort((a,b) => collatorEn.compare(a[0],b[0])).forEach(([label,count]) => {
    els.quartile.add(new Option(`${label} — ${faNumber.format(count)}`, label));
  });

  [...publisherCounts.entries()].sort((a,b) => b[1]-a[1] || collatorEn.compare(a[0],b[0])).forEach(([label,count]) => {
    els.publisher.add(new Option(`${label} — ${faNumber.format(count)}`, label));
  });
}

function renderHeroStats() {
  const subjects = new Set(state.journals.map(j => j.subject_fa).filter(Boolean)).size;
  const withAims = state.journals.filter(j => String(j.aims_and_scope_fa || "").trim()).length;
  const withDecision = state.journals.filter(j => hasNumber(j.submission_to_first_decision_days)).length;
  els.statTotal.textContent = faNumber.format(state.journals.length);
  els.statSubjects.textContent = faNumber.format(subjects);
  els.statAims.textContent = `${faNumber.format(withAims)} (${faNumber.format(withAims / state.journals.length * 100)}٪)`;
  els.statDecision.textContent = `${faNumber.format(withDecision)} (${faNumber.format(withDecision / state.journals.length * 100)}٪)`;
}

function acceptanceMatches(journal) {
  if (!state.acceptanceBand) return true;
  const value = journal.acceptance_rate_percent;
  if (!hasNumber(value)) return false;
  if (state.acceptanceBand === "lt20") return value < 20;
  if (state.acceptanceBand === "20to40") return value >= 20 && value <= 40;
  if (state.acceptanceBand === "gt40") return value > 40;
  return true;
}

function applyFilters({ resetPage = true } = {}) {
  if (resetPage) state.page = 1;
  const terms = normalize(state.query).split(" ").filter(Boolean);

  state.filtered = state.journals.filter((journal) => {
    if (journal.record_type !== "journal") return false;
    if (state.favoritesOnly && !state.favorites.has(journal.record_id)) return false;
    if (state.subject && journal.subject_fa !== state.subject) return false;
    if (state.quartile && quartileLabel(journal.index_quartile) !== state.quartile) return false;
    if (state.publisher && journal.publisher !== state.publisher) return false;
    if (state.availability === "aims" && !String(journal.aims_and_scope_fa || "").trim()) return false;
    if (state.availability === "acceptance" && !hasNumber(journal.acceptance_rate_percent)) return false;
    if (state.availability === "decision" && !hasNumber(journal.submission_to_first_decision_days)) return false;
    if (state.availability === "iranian" && !hasNumber(journal.iranian_author_count)) return false;
    if (!acceptanceMatches(journal)) return false;
    if (terms.length && !terms.every(term => journal._search.includes(term))) return false;
    return true;
  });

  const numericSort = (selector, direction = 1) => (a,b) => {
    const av = selector(a), bv = selector(b);
    if (!hasNumber(av)) return hasNumber(bv) ? 1 : 0;
    if (!hasNumber(bv)) return -1;
    return (av-bv) * direction;
  };

  if (state.sort === "title") state.filtered.sort((a,b) => collatorEn.compare(a.journal_title,b.journal_title));
  else if (state.sort === "acceptance") state.filtered.sort(numericSort(j => j.acceptance_rate_percent));
  else if (state.sort === "decision") state.filtered.sort(numericSort(j => j.submission_to_first_decision_days));
  else if (state.sort === "final") state.filtered.sort(numericSort(j => j.submission_to_acceptance_days));
  else if (state.sort === "iranian") state.filtered.sort(numericSort(j => j.iranian_author_count, -1));
  else state.filtered.sort((a,b) => a.record_id - b.record_id);

  render();
}

function cardTemplate(journal) {
  const link = externalLinkFor(journal);
  const favorite = state.favorites.has(journal.record_id);
  const compared = state.compare.has(journal.record_id);
  const scope = clampText(journal.coverage_scope_fa || journal.aims_and_scope_fa || "برای این رکورد توضیح تکمیلی ثبت نشده است.");
  return `
    <article class="journal-card" data-card-id="${journal.record_id}">
      <div class="journal-card__top">
        <div class="badge-row">
          <span class="badge badge--rank">${escapeHtml(quartileLabel(journal.index_quartile))}</span>
          <span class="badge">${escapeHtml(journal.subject_fa || "بدون حوزه")}</span>
        </div>
        <button class="icon-button ${favorite ? "is-active" : ""}" type="button" data-favorite="${journal.record_id}" aria-label="${favorite ? "حذف از علاقه‌مندی" : "افزودن به علاقه‌مندی"}" title="علاقه‌مندی">${favorite ? "★" : "☆"}</button>
      </div>
      <button class="compare-toggle ${compared ? "is-active" : ""}" type="button" data-compare="${journal.record_id}">${compared ? "✓ مقایسه" : "+ مقایسه"}</button>
      <div class="journal-card__body">
        <p class="journal-card__subject">ردیف ${faNumber.format(journal.record_id)} · ${escapeHtml(journal.subject_en || "")}</p>
        <h3>${escapeHtml(journal.journal_title)}</h3>
        <p class="publisher">${escapeHtml(journal.publisher || "ناشر اعلام نشده")}</p>
        <p class="scope-preview">${escapeHtml(scope)}</p>
        <dl class="metrics">
          <div><dt>نرخ پذیرش</dt><dd>${num(journal.acceptance_rate_percent,"٪")}</dd></div>
          <div><dt>تصمیم اول</dt><dd>${num(journal.submission_to_first_decision_days," روز")}</dd></div>
          <div><dt>پذیرش نهایی</dt><dd>${num(journal.submission_to_acceptance_days," روز")}</dd></div>
        </dl>
      </div>
      <div class="journal-card__actions">
        <button class="detail-button" type="button" data-detail="${journal.record_id}">جزئیات کامل</button>
        <a class="external-button" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(link.label)}" title="${escapeHtml(link.label)}">↗</a>
      </div>
    </article>`;
}

function hasActiveFilters() {
  return Boolean(state.query || state.subject || state.quartile || state.publisher || state.availability || state.acceptanceBand || state.sort !== "source" || state.favoritesOnly);
}

function render() {
  els.loading.hidden = true;
  els.error.hidden = true;
  const total = state.filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * PAGE_SIZE;
  const visible = state.filtered.slice(start, start + PAGE_SIZE);

  els.heading.textContent = `${faNumber.format(total)} نشریه پیدا شد${state.favoritesOnly ? " · فقط علاقه‌مندی‌ها" : ""}`;
  els.clear.hidden = !hasActiveFilters();
  els.empty.hidden = total !== 0;
  els.results.hidden = total === 0;
  els.results.classList.toggle("is-list", state.view === "list");
  els.results.innerHTML = visible.map(cardTemplate).join("");
  els.pagination.hidden = pages <= 1 || total === 0;
  els.pageIndicator.textContent = `صفحه ${faNumber.format(state.page)} از ${faNumber.format(pages)}`;
  els.prev.disabled = state.page <= 1;
  els.next.disabled = state.page >= pages;
  renderPersistentUi();
}

function renderPersistentUi() {
  els.favoriteCount.textContent = faNumber.format(state.favorites.size);
  els.favoritesOnly.setAttribute("aria-pressed", String(state.favoritesOnly));
  els.favoritesOnly.classList.toggle("is-active", state.favoritesOnly);

  const count = state.compare.size;
  els.compareCount.textContent = faNumber.format(count);
  els.compareLabel.textContent = `${faNumber.format(count)} مجله انتخاب شده`;
  els.compareTray.hidden = count === 0;
  els.compareOpen.disabled = count < 2;
  els.compareShow.disabled = count < 2;
}

function saveFavorites() {
  localStorage.setItem("jorfinder:favorites", JSON.stringify([...state.favorites]));
}

function clearFilters() {
  state.query = "";
  state.subject = "";
  state.quartile = "";
  state.publisher = "";
  state.availability = "";
  state.acceptanceBand = "";
  state.sort = "source";
  state.favoritesOnly = false;
  els.search.value = "";
  els.subject.value = "";
  els.quartile.value = "";
  els.publisher.value = "";
  els.availability.value = "";
  els.acceptanceBand.value = "";
  els.sort.value = "source";
  applyFilters();
  els.search.focus();
}

function toggleFavorite(id) {
  id = Number(id);
  if (state.favorites.has(id)) state.favorites.delete(id);
  else state.favorites.add(id);
  saveFavorites();
  if (state.favoritesOnly) applyFilters({ resetPage:false });
  else render();
}

function toggleCompare(id) {
  id = Number(id);
  if (state.compare.has(id)) state.compare.delete(id);
  else {
    if (state.compare.size >= MAX_COMPARE) {
      alert(`حداکثر ${faNumber.format(MAX_COMPARE)} مجله را می‌توانید هم‌زمان مقایسه کنید.`);
      return;
    }
    state.compare.add(id);
  }
  render();
}

function detailMetric(label, value) {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(textOrDash(value))}</dd></div>`;
}

function showJournal(id, { updateHash = true } = {}) {
  const journal = state.journals.find(item => item.record_id === Number(id));
  if (!journal) return;
  const link = externalLinkFor(journal);
  const isFavorite = state.favorites.has(journal.record_id);
  const isCompared = state.compare.has(journal.record_id);
  const pages = journal.source_page_start === journal.source_page_end || !journal.source_page_end
    ? `صفحه ${faNumber.format(journal.source_page_start)}`
    : `صفحات ${faNumber.format(journal.source_page_start)} تا ${faNumber.format(journal.source_page_end)}`;

  els.dialogContent.innerHTML = `
    <header class="dialog-hero">
      <div class="dialog-hero__meta">
        <span class="badge badge--rank">${escapeHtml(quartileLabel(journal.index_quartile))}</span>
        <span class="badge">${escapeHtml(journal.subject_fa || "—")}</span>
        <span class="badge badge--muted">${escapeHtml(journal.subject_en || "—")}</span>
        <span class="badge badge--muted">ردیف ${faNumber.format(journal.record_id)}</span>
      </div>
      <h2 id="dialog-title">${escapeHtml(journal.journal_title)}</h2>
      <p class="dialog-publisher">${escapeHtml(journal.publisher || "ناشر اعلام نشده")}</p>
      <div class="dialog-actions">
        <a class="primary-link" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">↗ ${escapeHtml(link.label)}</a>
        <a href="${escapeHtml(registryLinkFor(journal))}" target="_blank" rel="noopener noreferrer">ISSN Portal</a>
        <button type="button" data-dialog-favorite="${journal.record_id}">${isFavorite ? "★ حذف از علاقه‌مندی" : "☆ علاقه‌مندی"}</button>
        <button type="button" data-dialog-compare="${journal.record_id}">${isCompared ? "✓ در مقایسه" : "+ افزودن به مقایسه"}</button>
        <button type="button" data-copy-link="${journal.record_id}">کپی لینک این مجله</button>
        <small class="link-note">${link.type === "direct" ? "این URL به‌صورت مستقیم برای این نشریه شناسایی شده است." : "برای جلوگیری از ثبت URL حدسی، این لینک جست‌وجوی دقیق عنوان در سایت ناشر/وب است."}</small>
      </div>
    </header>

    <dl class="detail-metrics">
      ${detailMetric("نرخ پذیرش", rawMetric(journal,"acceptance_rate_raw","acceptance_rate_percent","٪"))}
      ${detailMetric("تصمیم اول", rawMetric(journal,"submission_to_first_decision_raw","submission_to_first_decision_days"," روز"))}
      ${detailMetric("پذیرش نهایی", rawMetric(journal,"submission_to_acceptance_raw","submission_to_acceptance_days"," روز"))}
      ${detailMetric("نویسندگان ایرانی", rawMetric(journal,"iranian_authors_raw","iranian_author_count"," مقاله"))}
    </dl>

    <div class="tabs" role="tablist" aria-label="بخش‌های جزئیات">
      <button class="tab-button is-active" type="button" role="tab" aria-selected="true" data-tab="overview">خلاصه</button>
      <button class="tab-button" type="button" role="tab" aria-selected="false" data-tab="aims">حوزه و اهداف</button>
      <button class="tab-button" type="button" role="tab" aria-selected="false" data-tab="raw">داده کامل</button>
      <button class="tab-button" type="button" role="tab" aria-selected="false" data-tab="source">منبع و اصلاحات</button>
    </div>

    <section class="tab-panel" data-panel="overview">
      <div class="detail-section"><h3>حوزه پوشش</h3><p>${escapeHtml(textOrDash(journal.coverage_scope_fa))}</p></div>
      <div class="detail-section"><h3>نمایه / رتبه</h3><p>${escapeHtml(quartileLabel(journal.index_quartile))}</p></div>
    </section>

    <section class="tab-panel" data-panel="aims" hidden>
      <div class="detail-section"><h3>حوزه‌های پوشش</h3><p>${escapeHtml(textOrDash(journal.coverage_scope_fa))}</p></div>
      <div class="detail-section"><h3>اهداف و چشم‌انداز کامل</h3><p>${escapeHtml(journal.aims_and_scope_fa || "در فایل مرجع برای این رکورد متن اهداف و چشم‌انداز درج نشده است.")}</p></div>
    </section>

    <section class="tab-panel" data-panel="raw" hidden>
      <div class="raw-grid">
        <div class="raw-item"><span>نرخ پذیرش — متن منبع</span><strong>${escapeHtml(textOrDash(journal.acceptance_rate_raw))}</strong></div>
        <div class="raw-item"><span>نرخ پذیرش — مقدار عددی</span><strong>${escapeHtml(num(journal.acceptance_rate_percent,"٪"))}</strong></div>
        <div class="raw-item"><span>نویسندگان ایرانی — متن منبع</span><strong>${escapeHtml(textOrDash(journal.iranian_authors_raw))}</strong></div>
        <div class="raw-item"><span>تعداد نویسندگان ایرانی</span><strong>${escapeHtml(num(journal.iranian_author_count))}</strong></div>
        <div class="raw-item"><span>درصد نویسندگان ایرانی</span><strong>${escapeHtml(num(journal.iranian_author_percent,"٪"))}</strong></div>
        <div class="raw-item"><span>ارسال تا پذیرش — متن منبع</span><strong>${escapeHtml(textOrDash(journal.submission_to_acceptance_raw))}</strong></div>
        <div class="raw-item"><span>ارسال تا پذیرش — روز</span><strong>${escapeHtml(num(journal.submission_to_acceptance_days," روز"))}</strong></div>
        <div class="raw-item"><span>ارسال تا تصمیم اول — متن منبع</span><strong>${escapeHtml(textOrDash(journal.submission_to_first_decision_raw))}</strong></div>
        <div class="raw-item"><span>ارسال تا تصمیم اول — روز</span><strong>${escapeHtml(num(journal.submission_to_first_decision_days," روز"))}</strong></div>
        <div class="raw-item"><span>نوع رکورد</span><strong>${escapeHtml(textOrDash(journal.record_type))}</strong></div>
        <div class="raw-item"><span>شناسه رکورد منبع</span><strong>${escapeHtml(textOrDash(journal.source_record_id))}</strong></div>
        <div class="raw-item"><span>شناسه داخلی</span><strong>${faNumber.format(journal.record_id)}</strong></div>
      </div>
    </section>

    <section class="tab-panel" data-panel="source" hidden>
      <div class="detail-section"><h3>اصلاحات ثبت‌شده در داده</h3><p>${escapeHtml(journal.data_corrections || "برای این رکورد اصلاح خاصی ثبت نشده است.")}</p></div>
      <div class="detail-section"><h3>ارجاع به فایل مرجع</h3><div class="source-box">ردیف منبع: <strong>${escapeHtml(textOrDash(journal.source_record_id))}</strong> · ${pages}<br>عنوان ثبت‌شده: <code>${escapeHtml(journal.journal_title)}</code></div></div>
    </section>`;

  els.dialogContent.querySelectorAll("[data-tab]").forEach(button => button.addEventListener("click", () => switchTab(button.dataset.tab)));
  els.dialogContent.querySelector("[data-dialog-favorite]")?.addEventListener("click", () => { toggleFavorite(journal.record_id); showJournal(journal.record_id, { updateHash:false }); });
  els.dialogContent.querySelector("[data-dialog-compare]")?.addEventListener("click", () => { toggleCompare(journal.record_id); showJournal(journal.record_id, { updateHash:false }); });
  els.dialogContent.querySelector("[data-copy-link]")?.addEventListener("click", async (event) => {
    const url = new URL(location.href); url.hash = `journal-${journal.record_id}`;
    try { await navigator.clipboard.writeText(url.toString()); event.currentTarget.textContent = "✓ لینک کپی شد"; } catch { prompt("لینک را کپی کنید:", url.toString()); }
  });

  if (!els.dialog.open) els.dialog.showModal();
  if (updateHash) history.replaceState(null, "", `#journal-${journal.record_id}`);
}

function switchTab(name) {
  els.dialogContent.querySelectorAll("[data-tab]").forEach(button => {
    const active = button.dataset.tab === name;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  els.dialogContent.querySelectorAll("[data-panel]").forEach(panel => { panel.hidden = panel.dataset.panel !== name; });
}

function closeJournal() {
  if (els.dialog.open) els.dialog.close();
  if (/^#journal-\d+$/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
}

function compareCell(value, extraClass = "") {
  return `<td class="${extraClass}">${escapeHtml(textOrDash(value))}</td>`;
}

function showCompare() {
  const journals = [...state.compare].map(id => state.journals.find(j => j.record_id === id)).filter(Boolean);
  if (journals.length < 2) return;
  const row = (label, getter, cls="") => `<tr><th>${escapeHtml(label)}</th>${journals.map(j => compareCell(getter(j), cls)).join("")}</tr>`;
  els.compareContent.innerHTML = `
    <header class="dialog-hero"><p class="section-kicker">مقایسه کنار هم</p><h2 id="compare-title">${faNumber.format(journals.length)} مجله انتخاب‌شده</h2><p>داده‌های ثبت‌شده در فایل مرجع بدون امتیازدهی یا رتبه‌بندی جدید نمایش داده می‌شوند.</p></header>
    <div class="compare-table-wrap"><table class="compare-table">
      <thead><tr><th>شاخص</th>${journals.map(j => `<th class="ltr">${escapeHtml(j.journal_title)}</th>`).join("")}</tr></thead>
      <tbody>
        ${row("ناشر", j=>j.publisher, "ltr")}
        ${row("حوزه", j=>j.subject_fa)}
        ${row("رتبه / نمایه", j=>quartileLabel(j.index_quartile))}
        ${row("نرخ پذیرش", j=>rawMetric(j,"acceptance_rate_raw","acceptance_rate_percent","٪"))}
        ${row("تصمیم اول", j=>rawMetric(j,"submission_to_first_decision_raw","submission_to_first_decision_days"," روز"))}
        ${row("پذیرش نهایی", j=>rawMetric(j,"submission_to_acceptance_raw","submission_to_acceptance_days"," روز"))}
        ${row("نویسندگان ایرانی", j=>rawMetric(j,"iranian_authors_raw","iranian_author_count"," مقاله"))}
        ${row("حوزه پوشش", j=>j.coverage_scope_fa)}
      </tbody>
    </table></div>`;
  els.compareDialog.showModal();
}

function updateView(view) {
  state.view = view;
  localStorage.setItem("jorfinder:view", view);
  document.querySelectorAll("[data-view]").forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  render();
}

async function decodeGzipBase64(parts) {
  const binary = atob(parts.join(""));
  const compressed = Uint8Array.from(binary, char => char.charCodeAt(0));
  if (!("DecompressionStream" in window)) throw new Error("Browser lacks DecompressionStream");
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"));
  const json = await new Response(stream).text();
  return JSON.parse(json);
}

async function fetchTextParts(prefix, count) {
  return Promise.all(Array.from({ length: count }, (_, i) =>
    fetch(`./data/${prefix}-${String(i).padStart(2,"0")}.txt`, { cache: "force-cache" }).then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
  ));
}

async function loadPackedData() {
  try {
    const manifestResponse = await fetch("./data/full-manifest.json", { cache: "no-cache" });
    if (manifestResponse.ok) {
      const manifest = await manifestResponse.json();
      if (manifest?.count > 0 && manifest?.compression === "gzip-base64") {
        const parts = await fetchTextParts("full", manifest.count);
        const journals = await decodeGzipBase64(parts);
        if (journals.length !== manifest.records) throw new Error("Full dataset record count mismatch");
        return journals;
      }
    }
  } catch (error) {
    console.warn("Full dataset unavailable; using fallback dataset.", error);
  }

  const fallbackParts = await fetchTextParts("packed", FALLBACK_PACK_COUNT);
  return decodeGzipBase64(fallbackParts);
}

let searchTimer;
els.search.addEventListener("input", event => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { state.query = event.target.value; applyFilters(); }, 140);
});
els.subject.addEventListener("change", e => { state.subject = e.target.value; applyFilters(); });
els.quartile.addEventListener("change", e => { state.quartile = e.target.value; applyFilters(); });
els.publisher.addEventListener("change", e => { state.publisher = e.target.value; applyFilters(); });
els.availability.addEventListener("change", e => { state.availability = e.target.value; applyFilters(); });
els.acceptanceBand.addEventListener("change", e => { state.acceptanceBand = e.target.value; applyFilters(); });
els.sort.addEventListener("change", e => { state.sort = e.target.value; applyFilters(); });
els.clear.addEventListener("click", clearFilters);
document.querySelector("[data-clear]").addEventListener("click", clearFilters);
els.favoritesOnly.addEventListener("click", () => { state.favoritesOnly = !state.favoritesOnly; applyFilters(); });
document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => updateView(button.dataset.view)));

els.results.addEventListener("click", event => {
  const favorite = event.target.closest("[data-favorite]");
  if (favorite) return toggleFavorite(favorite.dataset.favorite);
  const compare = event.target.closest("[data-compare]");
  if (compare) return toggleCompare(compare.dataset.compare);
  const detail = event.target.closest("[data-detail]");
  if (detail) return showJournal(detail.dataset.detail);
});

els.next.addEventListener("click", () => { state.page += 1; render(); document.querySelector("#results-heading").scrollIntoView({ behavior:"smooth", block:"start" }); });
els.prev.addEventListener("click", () => { state.page -= 1; render(); document.querySelector("#results-heading").scrollIntoView({ behavior:"smooth", block:"start" }); });
els.dialogClose.addEventListener("click", closeJournal);
els.dialog.addEventListener("click", event => { if (event.target === els.dialog) closeJournal(); });
els.compareClose.addEventListener("click", () => els.compareDialog.close());
els.compareDialog.addEventListener("click", event => { if (event.target === els.compareDialog) els.compareDialog.close(); });
els.compareShow.addEventListener("click", showCompare);
els.compareOpen.addEventListener("click", showCompare);
els.compareClear.addEventListener("click", () => { state.compare.clear(); render(); });

document.addEventListener("keydown", event => {
  if (event.key === "/" && !["INPUT","SELECT","TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault(); els.search.focus();
  }
});

document.querySelectorAll("[data-view]").forEach(button => {
  const active = button.dataset.view === state.view;
  button.classList.toggle("is-active", active);
  button.setAttribute("aria-pressed", String(active));
});
renderPersistentUi();

loadPackedData()
  .then(journals => {
    state.journals = journals.map(journal => ({ ...journal, _search: buildSearchText(journal) }));
    populateFilters();
    renderHeroStats();
    applyFilters();
    const match = location.hash.match(/^#journal-(\d+)$/);
    if (match) showJournal(match[1], { updateHash:false });
  })
  .catch(error => {
    console.error(error);
    els.loading.hidden = true;
    els.error.hidden = false;
    els.heading.textContent = "خطا در بارگذاری فهرست";
  });
