const PAGE_SIZE = 12;
const state = {
  journals: [],
  filtered: [],
  query: "",
  subject: "",
  quartile: "",
  availability: "",
  sort: "source",
  page: 1,
};

const els = {
  search: document.querySelector("#search"),
  subject: document.querySelector("#subject-filter"),
  quartile: document.querySelector("#quartile-filter"),
  availability: document.querySelector("#data-filter"),
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
};

const faDigits = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
const collator = new Intl.Collator("en", { sensitivity: "base" });

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

function numberOrDash(value, suffix = "") {
  return hasNumber(value) ? `${faDigits.format(value)}${suffix}` : "—";
}

function quartileClass(quartile) {
  return /^Q[1-4]$/i.test(quartile || "") ? "quartile" : "quartile quartile--muted";
}

function quartileLabel(quartile) {
  const text = (quartile || "").trim();
  return text && text !== "اعلام نشده" ? text : "نامشخص";
}

function searchableText(journal) {
  return normalize([
    journal.journal_title,
    journal.publisher,
    journal.subject_fa,
    journal.subject_en,
    journal.coverage_scope_fa,
  ].join(" "));
}

function populateSubjects() {
  const counts = new Map();
  state.journals.forEach((journal) => {
    counts.set(journal.subject_fa, (counts.get(journal.subject_fa) || 0) + 1);
  });
  [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], "fa")).forEach(([subject, count]) => {
    const option = document.createElement("option");
    option.value = subject;
    option.textContent = `${subject} — ${faDigits.format(count)}`;
    els.subject.append(option);
  });
}

function applyFilters({ resetPage = true } = {}) {
  if (resetPage) state.page = 1;
  const terms = normalize(state.query).split(" ").filter(Boolean);

  state.filtered = state.journals.filter((journal) => {
    if (journal.record_type !== "journal") return false;
    if (state.subject && journal.subject_fa !== state.subject) return false;
    if (state.quartile === "other") {
      if (/^Q[1-4]$/i.test(journal.index_quartile || "")) return false;
    } else if (state.quartile && !normalize(journal.index_quartile).includes(normalize(state.quartile))) {
      return false;
    }
    if (state.availability === "acceptance" && !hasNumber(journal.acceptance_rate_percent)) return false;
    if (state.availability === "decision" && !hasNumber(journal.submission_to_first_decision_days)) return false;
    if (state.availability === "iranian" && !hasNumber(journal.iranian_author_count)) return false;
    if (terms.length) {
      const haystack = journal._search;
      if (!terms.every((term) => haystack.includes(term))) return false;
    }
    return true;
  });

  const missingLast = (selector) => (a, b) => {
    const av = selector(a);
    const bv = selector(b);
    if (!hasNumber(av)) return hasNumber(bv) ? 1 : 0;
    if (!hasNumber(bv)) return -1;
    return av - bv;
  };
  if (state.sort === "title") state.filtered.sort((a, b) => collator.compare(a.journal_title, b.journal_title));
  if (state.sort === "acceptance") state.filtered.sort(missingLast((j) => j.acceptance_rate_percent));
  if (state.sort === "decision") state.filtered.sort(missingLast((j) => j.submission_to_first_decision_days));

  render();
}

function resultCard(journal) {
  return `
    <article class="journal-card">
      <div class="journal-card__folio">
        <span class="journal-card__id">NO. ${String(journal.record_id).padStart(3, "0")}</span>
        <span class="${quartileClass(journal.index_quartile)}">${escapeHtml(quartileLabel(journal.index_quartile))}</span>
      </div>
      <div class="journal-card__body">
        <p class="subject-label">${escapeHtml(journal.subject_fa)}</p>
        <h3>${escapeHtml(journal.journal_title)}</h3>
        <p class="publisher">${escapeHtml(journal.publisher || "ناشر اعلام نشده")}</p>
        <dl class="metrics">
          <div><dt>نرخ پذیرش</dt><dd>${numberOrDash(journal.acceptance_rate_percent, "٪")}</dd></div>
          <div><dt>تصمیم اول</dt><dd>${numberOrDash(journal.submission_to_first_decision_days, " روز")}</dd></div>
          <div><dt>پذیرش نهایی</dt><dd>${numberOrDash(journal.submission_to_acceptance_days, " روز")}</dd></div>
        </dl>
      </div>
      <button class="card-action" type="button" data-id="${journal.record_id}" aria-label="نمایش جزئیات ${escapeHtml(journal.journal_title)}"><span>جزئیات</span></button>
    </article>`;
}

function render() {
  els.loading.hidden = true;
  els.error.hidden = true;
  const total = state.filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * PAGE_SIZE;
  const visible = state.filtered.slice(start, start + PAGE_SIZE);
  const hasFilters = Boolean(state.query || state.subject || state.quartile || state.availability || state.sort !== "source");

  els.heading.textContent = `${faDigits.format(total)} نشریه پیدا شد`;
  els.clear.hidden = !hasFilters;
  els.empty.hidden = total !== 0;
  els.results.hidden = total === 0;
  els.results.innerHTML = visible.map(resultCard).join("");
  els.pagination.hidden = pages <= 1 || total === 0;
  els.pageIndicator.textContent = `صفحهٔ ${faDigits.format(state.page)} از ${faDigits.format(pages)}`;
  els.prev.disabled = state.page <= 1;
  els.next.disabled = state.page >= pages;
}

function clearFilters() {
  state.query = "";
  state.subject = "";
  state.quartile = "";
  state.availability = "";
  state.sort = "source";
  els.search.value = "";
  els.subject.value = "";
  els.quartile.value = "";
  els.availability.value = "";
  els.sort.value = "source";
  applyFilters();
  els.search.focus();
}

function showJournal(id) {
  const journal = state.journals.find((item) => item.record_id === Number(id));
  if (!journal) return;
  const scope = journal.coverage_scope_fa || "در منبع شرح جداگانه‌ای برای حوزهٔ پوشش ثبت نشده است.";
  els.dialogContent.innerHTML = `
    <header class="dialog-header">
      <div class="dialog-header__meta">
        <span>${escapeHtml(journal.subject_fa)}</span>
        <span aria-hidden="true">/</span>
        <span class="${quartileClass(journal.index_quartile)}">${escapeHtml(quartileLabel(journal.index_quartile))}</span>
      </div>
      <h2 id="dialog-title">${escapeHtml(journal.journal_title)}</h2>
      <p class="dialog-publisher">${escapeHtml(journal.publisher || "ناشر اعلام نشده")}</p>
    </header>
    <dl class="dialog-metrics">
      <div><dt>نرخ پذیرش</dt><dd>${numberOrDash(journal.acceptance_rate_percent, "٪")}</dd></div>
      <div><dt>تصمیم اول</dt><dd>${numberOrDash(journal.submission_to_first_decision_days, " روز")}</dd></div>
      <div><dt>پذیرش نهایی</dt><dd>${numberOrDash(journal.submission_to_acceptance_days, " روز")}</dd></div>
      <div><dt>نویسندگان ایرانی</dt><dd>${numberOrDash(journal.iranian_author_count, " مقاله")}</dd></div>
    </dl>
    <section class="dialog-section">
      <h3>حوزه‌های پوشش</h3>
      <p>${escapeHtml(scope)}</p>
    </section>
    <p class="source-note">ردیف ${faDigits.format(journal.record_id)} · صفحهٔ ${faDigits.format(journal.source_page_start)} فایل مرجع</p>`;
  els.dialog.showModal();
}

let searchTimer;
els.search.addEventListener("input", (event) => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    state.query = event.target.value;
    applyFilters();
  }, 160);
});
els.subject.addEventListener("change", (event) => { state.subject = event.target.value; applyFilters(); });
els.quartile.addEventListener("change", (event) => { state.quartile = event.target.value; applyFilters(); });
els.availability.addEventListener("change", (event) => { state.availability = event.target.value; applyFilters(); });
els.sort.addEventListener("change", (event) => { state.sort = event.target.value; applyFilters(); });
els.clear.addEventListener("click", clearFilters);
document.querySelector("[data-clear]").addEventListener("click", clearFilters);
els.results.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-id]");
  if (trigger) showJournal(trigger.dataset.id);
});
els.next.addEventListener("click", () => { state.page += 1; render(); document.querySelector("#results-heading").scrollIntoView({ behavior: "smooth" }); });
els.prev.addEventListener("click", () => { state.page -= 1; render(); document.querySelector("#results-heading").scrollIntoView({ behavior: "smooth" }); });
els.dialogClose.addEventListener("click", () => els.dialog.close());
els.dialog.addEventListener("click", (event) => {
  if (event.target === els.dialog) els.dialog.close();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    els.search.focus();
  }
});

Promise.all(Array.from({ length: 20 }, (_, i) =>
  fetch(`./data/magazines-${String(i).padStart(2, "0")}.json`).then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
))
  .then((parts) => parts.flat())
  .then((journals) => {
    state.journals = journals.map((journal) => ({ ...journal, _search: searchableText(journal) }));
    populateSubjects();
    applyFilters();
  })
  .catch(() => {
    els.loading.hidden = true;
    els.error.hidden = false;
    els.heading.textContent = "خطا در بارگذاری فهرست";
  });
