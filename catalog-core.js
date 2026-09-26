/* Pure catalogue search, filtering and sorting. Shared by the UI and tests. */
(function (root) {
  "use strict";

  function normalize(value = "") {
    return String(value)
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[يى]/g, "ی")
      .replace(/ك/g, "ک")
      .replace(/[ًٌٍَُِّْـ]/g, "")
      .replace(/[\u200c\u200d]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hasNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function quartileLabel(value) {
    const text = String(value || "").trim();
    return text && text !== "اعلام نشده" ? text : "نامشخص";
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

  function prepareJournals(journals) {
    return journals.map(journal => ({ ...journal, _search: buildSearchText(journal) }));
  }

  function numericSort(selector, direction = 1) {
    return (a, b) => {
      const av = selector(a), bv = selector(b);
      if (!hasNumber(av)) return hasNumber(bv) ? 1 : 0;
      if (!hasNumber(bv)) return -1;
      return (av - bv) * direction;
    };
  }

  function filterAndSort(journals, filters = {}, options = {}) {
    const favorites = options.favorites || new Set();
    const linkType = options.linkType || (() => "search");
    const collatorFa = options.collatorFa || new Intl.Collator("fa", { sensitivity: "base" });
    const collatorEn = options.collatorEn || new Intl.Collator("en", { sensitivity: "base" });
    const terms = normalize(filters.query).split(" ").filter(Boolean);

    const matches = journals.filter(journal => {
      if (journal.record_type !== "journal") return false;
      if (filters.favoritesOnly && !favorites.has(journal.record_id)) return false;
      if (filters.subject && journal.subject_fa !== filters.subject) return false;
      if (filters.quartile && quartileLabel(journal.index_quartile) !== filters.quartile) return false;
      if (filters.publisher && journal.publisher !== filters.publisher) return false;
      if (filters.linkStatus && linkType(journal) !== filters.linkStatus) return false;
      if (filters.availability === "aims" && !String(journal.aims_and_scope_fa || "").trim()) return false;
      if (filters.availability === "acceptance" && !hasNumber(journal.acceptance_rate_percent)) return false;
      if (filters.availability === "decision" && !hasNumber(journal.submission_to_first_decision_days)) return false;
      if (filters.availability === "iranian" && !hasNumber(journal.iranian_author_count)) return false;
      const acceptance = journal.acceptance_rate_percent;
      if (filters.acceptanceBand === "lt20" && (!hasNumber(acceptance) || acceptance >= 20)) return false;
      if (filters.acceptanceBand === "20to40" && (!hasNumber(acceptance) || acceptance < 20 || acceptance > 40)) return false;
      if (filters.acceptanceBand === "gt40" && (!hasNumber(acceptance) || acceptance <= 40)) return false;
      const searchText = journal._search ?? buildSearchText(journal);
      return !terms.length || terms.every(term => searchText.includes(term));
    });

    const sort = filters.sort || "source";
    const comparators = {
      title: (a, b) => collatorEn.compare(a.journal_title, b.journal_title),
      acceptance: numericSort(journal => journal.acceptance_rate_percent),
      decision: numericSort(journal => journal.submission_to_first_decision_days),
      final: numericSort(journal => journal.submission_to_acceptance_days),
      iranian: numericSort(journal => journal.iranian_author_count, -1),
      source: (a, b) => a.record_id - b.record_id,
    };
    return matches.sort(comparators[sort] || comparators.source);
  }

  const catalogCore = { normalize, hasNumber, quartileLabel, buildSearchText, prepareJournals, filterAndSort };
  root.CatalogCore = catalogCore;
  if (typeof module !== "undefined" && module.exports) module.exports = catalogCore;
})(typeof window !== "undefined" ? window : globalThis);
