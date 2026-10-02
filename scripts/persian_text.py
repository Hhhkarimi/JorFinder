"""Repair recurring Persian PDF-extraction artifacts in catalogue prose."""
from __future__ import annotations

import re

ZWNJ = "\u200c"
LETTER_CLASS = "\u0621-\u063A\u0641-\u064A\u066E-\u06D3"

# These joins are extraction seams observed across the catalogue.  They are
# deliberately narrower than a generic "remove Persian spaces" rule so real
# word boundaries remain untouched.
BROKEN_JOINS = {
    "طبق هبندیها": f"طبقه{ZWNJ}بندی{ZWNJ}ها",
    "روا ن": "روان",
    "سیاس ت": "سیاست",
    "پژوه ش": "پژوهش",
    "رو ش": "روش",
    "زبا ن": "زبان",
    "حوز ه": "حوزه",
    "رشت ه": "رشته",
    "حرف ه": "حرفه",
    "داد ه": "داده",
    "برنام ه": "برنامه",
    "محی ط": "محیط",
    "دیدگا ه": "دیدگاه",
    "تفاو ت": "تفاوت",
    "فناور ی": "فناوری",
    "نظری هها": f"نظریه{ZWNJ}ها",
    "نظری ههای": f"نظریه{ZWNJ}های",
    "شیو ه": "شیوه",
    "جنب ه": "جنبه",
    "پدید ه": "پدیده",
    "مجل ه": "مجله",
    "مسئل ه": "مسئله",
    "دانشگا ه": "دانشگاه",
    "یافت ه": "یافته",
    "زمین ه": "زمینه",
    "چال ش": "چالش",
    "بخ ش": "بخش",
    "انسا ن": "انسان",
    "جم ع": "جمع",
    "پی ش": "پیش",
    "کال س": "کلاس",
    "پروژ ه": "پروژه",
    "پلتفر م": "پلتفرم",
    "مکانیس م": "مکانیسم",
    "مد ل": "مدل",
    "سازما ن": "سازمان",
    "آزمو ن": "آزمون",
    "مفهو م": "مفهوم",
    "محدود ه": "محدوده",
    "صفح ه": "صفحه",
    "عالق ه": "علاقه",
    "زیبای یشناسی": f"زیبایی{ZWNJ}شناسی",
    "جامع هشناختی": f"جامعه{ZWNJ}شناختی",
    "روزنام هنگاری": f"روزنامه{ZWNJ}نگاری",
    "تاری خنگاری": f"تاریخ{ZWNJ}نگاری",
    "قو منگاری": f"قوم{ZWNJ}نگاری",
    "چش مانداز": f"چشم{ZWNJ}انداز",
    "زیس تمحیطی": f"زیست{ZWNJ}محیطی",
    "اطال عرسانی": f"اطلاع{ZWNJ}رسانی",
    "بی نفرهنگی": f"بین{ZWNJ}فرهنگی",
    "طبق هبندی": f"طبقه{ZWNJ}بندی",
    "دان شآموز": f"دانش{ZWNJ}آموز",
    "کس بوکار": f"کسب{ZWNJ}وکار",
    "ب هویژه": f"به{ZWNJ}ویژه",
    "ب هکار": f"به{ZWNJ}کار",
    "اشترا کگذاری": f"اشتراک{ZWNJ}گذاری",
    "منعک سکننده": f"منعکس{ZWNJ}کننده",
    "تحلی ل": "تحلیل",
    "کتا ب": "کتاب",
    "زیبای ی": "زیبایی",
    "دان شپژوه": f"دانش{ZWNJ}پژوه",
    "دان شمحور": f"دانش{ZWNJ}محور",
    "دان شبنیان": f"دانش{ZWNJ}بنیان",
    "اطال عسنج": f"اطلاع{ZWNJ}سنج",
    "اطال عیاب": f"اطلاع{ZWNJ}یاب",
    "چارچو ببند": f"چارچوب{ZWNJ}بند",
    "ثب تشده": f"ثبت{ZWNJ}شده",
}

LEXICAL_FIXES = {
    "اعالم": "اعلام",
    "اطالعات": "اطلاعات",
    "مقاالت": "مقالات",
    "مقاالتی": "مقالاتی",
    "تحوالت": "تحولات",
    "باال": "بالا",
    "باالترین": "بالاترین",
    "معموال": "معمولا",
    "ساالنه": "سالانه",
    "عالقمند": f"علاقه{ZWNJ}مند",
    "علاقهمند": f"علاقه{ZWNJ}مند",
    "نظریهستند": "نظری هستند",
    "زمینهسازی": f"زمینه{ZWNJ}سازی",
    "مفهومسازی": f"مفهوم{ZWNJ}سازی",
    "کتابسنجی": f"کتاب{ZWNJ}سنجی",
    "حرفهای": f"حرفه{ZWNJ}ای",
    "کتابهایی": f"کتاب{ZWNJ}هایی",
    "ب هموقع": f"به{ZWNJ}موقع",
}

ADJECTIVE_EH_ROOTS = (
    "رشت", "حرف", "مجل", "گسترد", "منطق", "رسان", "حوز", "صفح",
)

# PDF text extraction often cuts a word immediately before its last letter and
# leaves that letter attached to a productive suffix.  The right-hand fragments
# below are not standalone Persian words, so joining them is safe throughout
# the catalogue (unlike a blanket Persian-space removal).
BROKEN_SUFFIX_FRAGMENTS = re.compile(
    r"(?P<stem>[\u0600-\u06FF\u200c]+)\s+"
    r"(?P<fragment>"
    r"[ابتثجچحخدذرزژسشصضطظعغفقکگلمنوهی](?:ها|های)|"
    r"[هی](?:تر|تری|ترین)|هاند|ی(?:شده|سازی|مند)|"
    r"[بدمهنسشتج](?:شناسی|سنجی|گیری|سازی)"
    r")(?=$|[^\u0621-\u063A\u0641-\u064A\u066E-\u06D3])"
)


def _join_suffix_fragment(match: re.Match[str]) -> str:
    stem, fragment = match.group("stem"), match.group("fragment")
    joined = stem + fragment[0]
    suffix = fragment[1:]
    if suffix in {"ها", "های", "تر", "تری", "ترین", "اند", "ای", "ایی", "شده"}:
        return joined + ZWNJ + suffix
    return joined + suffix


def repair_persian_text(value: str) -> str:
    """Return Persian prose with known extraction seams repaired."""
    text = value.replace("ي", "ی").replace("ك", "ک")
    text = re.sub(rf"(?<![{LETTER_CLASS}])نم\s+ی(?=\S)", f"نمی{ZWNJ}", text)
    text = re.sub(rf"(?<![{LETTER_CLASS}])م\s+ی(?=\S)", f"می{ZWNJ}", text)
    text = re.sub(rf"(?<![{LETTER_CLASS}])می\s+کند(?![{LETTER_CLASS}])", f"می{ZWNJ}کند", text)
    verbs = "کند|کنند|شود|شوند|دهد|دهند|گیرد|گیرند|پردازد|پردازند|تواند|توانند|یابد|یابند|گوید|گویند|آید|آیند|سازد|سازند"
    text = re.sub(
        rf"(?<![{LETTER_CLASS}])(ن?می)\s+({verbs})(?![{LETTER_CLASS}])",
        rf"\1{ZWNJ}\2",
        text,
    )
    text = re.sub(rf"(?<![{LETTER_CLASS}])بی\s+نالملل", f"بین{ZWNJ}الملل", text)
    text = re.sub(rf"(?<![{LETTER_CLASS}])بی\s+ن(?:\s*|‌)رشت", f"بین{ZWNJ}رشت", text)
    text = re.sub(rf"(?<![{LETTER_CLASS}])میا\s+نرشت", f"میان{ZWNJ}رشت", text)
    text = re.sub(rf"(?<![{LETTER_CLASS}])نرشت", f"ن{ZWNJ}رشت", text)
    text = re.sub(rf"([{LETTER_CLASS}])ه\s+ای(?![{LETTER_CLASS}])", rf"\1ه{ZWNJ}ای", text)

    roots = "|".join(map(re.escape, ADJECTIVE_EH_ROOTS))
    text = re.sub(rf"(?<![{LETTER_CLASS}])({roots})\s+های(?![{LETTER_CLASS}])", rf"\1ه{ZWNJ}ای", text)
    text = re.sub(rf"([{LETTER_CLASS}\u200c]+)\s+(ها|های)(?![{LETTER_CLASS}])", rf"\1{ZWNJ}\2", text)

    for broken, repaired in BROKEN_JOINS.items():
        text = text.replace(broken, repaired)

    # Run twice for constructs with two adjacent extraction seams.
    text = BROKEN_SUFFIX_FRAGMENTS.sub(_join_suffix_fragment, text)
    text = BROKEN_SUFFIX_FRAGMENTS.sub(_join_suffix_fragment, text)

    # A suffix repair can expose an adjacent lexical seam (for example
    # ``طبق هبند یها`` -> ``طبق هبندی‌ها``), so resolve joins once more.
    for broken, repaired in BROKEN_JOINS.items():
        text = text.replace(broken, repaired)

    text = re.sub(rf"([{LETTER_CLASS}])هها(?![{LETTER_CLASS}])", rf"\1ه{ZWNJ}ها", text)
    text = re.sub(rf"([{LETTER_CLASS}])ههای(?![{LETTER_CLASS}])", rf"\1ه{ZWNJ}های", text)

    # Add the standard half-space only to words that were repaired above.
    repaired_bases = tuple(set(BROKEN_JOINS.values()))
    bases = "|".join(map(re.escape, repaired_bases))
    text = re.sub(rf"(?<![{LETTER_CLASS}])({bases})(ها|های)(?![{LETTER_CLASS}])", rf"\1{ZWNJ}\2", text)

    for broken, repaired in LEXICAL_FIXES.items():
        text = text.replace(broken, repaired)
    return re.sub(r" {2,}", " ", text).strip()


ARTIFACT_PATTERNS = (
    re.compile(r"(?<![\u0600-\u06FF])(?:نم\s+ی|م\s+ی)(?=\S)"),
    re.compile(r"(?<![\u0600-\u06FF])بی\s+نالملل"),
    re.compile(r"(?<![\u0600-\u06FF])میا\s+نرشت|(?<![\u0600-\u06FF])نرشت"),
    *(re.compile(re.escape(item)) for item in BROKEN_JOINS),
    BROKEN_SUFFIX_FRAGMENTS,
)


def find_spacing_artifacts(value: str) -> list[str]:
    """Return known broken fragments still present in a text."""
    return [match.group(0) for pattern in ARTIFACT_PATTERNS for match in pattern.finditer(value)]
