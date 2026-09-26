/* Local, explainable text matching. No submitted manuscript text leaves the browser. */
(function (root) {
  "use strict";

  const STOP = new Set(`
    the and for with from into about between among using use used study studies research
    review analysis approach approaches paper article articles based effect effects role
    this that these those are was were has have had its their our your can may how
    results findings data method methods journal journals international new model models
    در از به با بر برای این آن یک که و یا را است هستند شده شود می های ها نیز
    پژوهش بررسی مطالعه مطالعات مقاله مقالات نتایج روش روشهای داده جدید نقش تاثیر
    حوزه زمینه مجله نشریه علمی علوم بین المللی مورد موارد استفاده ارائه اساس
  `.trim().split(/\s+/));

  // Short, explicit equivalences bridge common English and Persian subject terms.
  // They are matched as complete words or phrases, not arbitrary substrings.
  const CONCEPTS = [
    ["education", ["آموزش", "آموزشی", "تربیت", "education", "educational", "teaching"]],
    ["literature", ["ادبیات", "literature", "literary"]],
    ["linguistics", ["زبان شناسی", "زبانشناسی", "linguistics", "language studies"]],
    ["communication", ["ارتباطات", "communication", "media studies", "رسانه"]],
    ["economics", ["اقتصاد", "اقتصادی", "economics", "economic"]],
    ["history", ["تاریخ", "تاریخی", "history", "historical"]],
    ["geography", ["جغرافیا", "جغرافیایی", "geography", "geographic"]],
    ["psychology", ["روان شناسی", "روانشناسی", "psychology", "psychological"]],
    ["information", ["علم اطلاعات", "دانش شناسی", "information science", "library science"]],
    ["sociology", ["جامعه شناسی", "جامعهشناسی", "علوم اجتماعی", "sociology", "sociological", "social sciences"]],
    ["religion", ["الهیات", "دین پژوهی", "theology", "religious studies"]],
    ["sport", ["ورزش", "ورزشی", "sport", "sports"]],
    ["philosophy", ["فلسفه", "فلسفی", "philosophy", "philosophical"]],
    ["ethics", ["اخلاق", "اخلاقی", "ethics", "ethical"]],
    ["management", ["مدیریت", "management", "managerial"]],
    ["counseling", ["مشاوره", "counseling", "counselling"]],
    ["art", ["هنر", "هنری", "art", "art studies", "arts"]],
    ["technology", ["فناوری", "تکنولوژی", "technology", "technological", "دیجیتال", "digital"]],
    ["ai", ["هوش مصنوعی", "artificial intelligence", "ai", "یادگیری ماشین", "machine learning", "deep learning"]],
    ["climate", ["تغییر اقلیم", "تغییرات اقلیمی", "climate change", "climate"]],
  ];

  function normalized(value) {
    return String(value || "").toLowerCase().normalize("NFKC")
      .replace(/[يى]/g, "ی").replace(/ك/g, "ک")
      .replace(/[ًٌٍَُِّْـ]/g, "")
      .replace(/[\u200c\u200d]/g, " ")
      .replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
  }

  const NORMALIZED_CONCEPTS = CONCEPTS.map(([key, aliases]) => [key, aliases.map(normalized)]);

  function words(value) {
    return normalized(value).split(" ").filter(word => word.length >= 3 && !STOP.has(word));
  }

  function terms(value) {
    const text = ` ${normalized(value)} `;
    const found = new Set(words(value));
    for (const [key, aliases] of NORMALIZED_CONCEPTS) {
      if (aliases.some(alias => text.includes(` ${alias} `))) found.add(`concept:${key}`);
    }
    return found;
  }

  function createRecommender(journals) {
    const documents = journals.filter(j => j.record_type === "journal").map(journal => {
      const fields = [
        terms(journal.journal_title),
        terms(`${journal.subject_fa} ${journal.subject_en}`),
        terms(journal.coverage_scope_fa),
        terms(journal.aims_and_scope_fa),
      ];
      return { journal, fields, all: new Set(fields.flatMap(field => [...field])) };
    });
    const frequency = new Map();
    for (const doc of documents) for (const term of doc.all) frequency.set(term, (frequency.get(term) || 0) + 1);

    function recommend({ title = "", abstract = "", keywords = "" }, limit = 10) {
      const weights = new Map();
      const add = (items, weight) => {
        for (const term of items) weights.set(term, Math.max(weights.get(term) || 0, weight));
      };
      add(terms(title), 2.4);
      add(terms(keywords), 3);
      const abstractTerms = [...terms(abstract)]
        .filter(term => frequency.has(term) && frequency.get(term) < documents.length * .7)
        .sort((a, b) => (frequency.get(a) || 0) - (frequency.get(b) || 0))
        .slice(0, 35);
      add(abstractTerms, .65);
      if (!weights.size) return [];

      const weightedQuery = [...weights].map(([term, weight]) => {
        const rarity = 1 + .55 * Math.log((documents.length + 1) / ((frequency.get(term) || 0) + 1)) / Math.log(documents.length + 1);
        return [term, weight * rarity];
      });
      const total = weightedQuery.reduce((sum, [, weight]) => sum + weight, 0);
      const fieldNames = ["عنوان نشریه", "حوزهٔ علمی", "حوزهٔ پوشش", "اهداف و چشم‌انداز"];
      const fieldStrength = [1, .95, .8, .48];
      const unique = new Map();

      for (const doc of documents) {
        let matched = 0;
        let matchedCount = 0;
        const evidence = new Map();
        const matchingTerms = [];
        for (const [term, weight] of weightedQuery) {
          const field = doc.fields.findIndex(set => set.has(term));
          if (field === -1) continue;
          const contribution = weight * fieldStrength[field];
          matched += contribution;
          matchedCount++;
          evidence.set(field, (evidence.get(field) || 0) + contribution);
          if (!term.startsWith("concept:") && matchingTerms.length < 5) matchingTerms.push(term);
        }
        const score = Math.min(99, Math.round(matched / total * 100));
        if (matchedCount < 2 || score < 10) continue;
        const result = {
          journal: doc.journal, score,
          evidence: [...evidence].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([field]) => fieldNames[field]),
          matchingTerms,
        };
        const key = normalized(doc.journal.journal_title);
        if (!unique.has(key) || score > unique.get(key).score) unique.set(key, result);
      }
      return [...unique.values()]
        .sort((a, b) => b.score - a.score || a.journal.record_id - b.journal.record_id)
        .slice(0, Math.max(1, Math.min(20, limit)));
    }
    return { recommend };
  }

  root.JournalRecommender = { createRecommender };
  if (typeof module !== "undefined" && module.exports) module.exports = { createRecommender };
})(typeof window !== "undefined" ? window : globalThis);
