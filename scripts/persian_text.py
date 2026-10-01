"""Repair recurring Persian PDF-extraction artifacts in catalogue prose."""
from __future__ import annotations

import re

ZWNJ = "\u200c"

# These joins are extraction seams observed across the catalogue.  They are
# deliberately narrower than a generic "remove Persian spaces" rule so real
# word boundaries remain untouched.
BROKEN_JOINS = {
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
    "نظری ه": "نظریه",
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
}

ADJECTIVE_EH_ROOTS = (
    "رشت", "حرف", "مجل", "گسترد", "منطق", "رسان", "حوز", "صفح",
)


def repair_persian_text(value: str) -> str:
    """Return Persian prose with known extraction seams repaired."""
    text = value.replace("ي", "ی").replace("ك", "ک")
    text = re.sub(r"(?<![\u0600-\u06FF])نم\s+ی(?=\S)", f"نمی{ZWNJ}", text)
    text = re.sub(r"(?<![\u0600-\u06FF])م\s+ی(?=\S)", f"می{ZWNJ}", text)
    text = re.sub(r"(?<![\u0600-\u06FF])بی\s+نالملل", f"بین{ZWNJ}الملل", text)
    text = re.sub(r"(?<![\u0600-\u06FF])میا\s+نرشت", f"میان{ZWNJ}رشت", text)
    text = re.sub(r"(?<![\u0600-\u06FF])نرشت", f"ن{ZWNJ}رشت", text)

    roots = "|".join(map(re.escape, ADJECTIVE_EH_ROOTS))
    text = re.sub(rf"(?<![\u0600-\u06FF])({roots})\s+های(?![\u0600-\u06FF])", rf"\1ه{ZWNJ}ای", text)

    for broken, repaired in BROKEN_JOINS.items():
        text = text.replace(broken, repaired)

    text = re.sub(r"([\u0600-\u06FF])هها(?![\u0600-\u06FF])", rf"\1ه{ZWNJ}ها", text)
    text = re.sub(r"([\u0600-\u06FF])ههای(?![\u0600-\u06FF])", rf"\1ه{ZWNJ}های", text)

    # Add the standard half-space only to words that were repaired above.
    repaired_bases = tuple(set(BROKEN_JOINS.values()))
    bases = "|".join(map(re.escape, repaired_bases))
    text = re.sub(rf"(?<![\u0600-\u06FF])({bases})(ها|های)(?![\u0600-\u06FF])", rf"\1{ZWNJ}\2", text)

    for broken, repaired in LEXICAL_FIXES.items():
        text = text.replace(broken, repaired)
    return re.sub(r" {2,}", " ", text).strip()


ARTIFACT_PATTERNS = (
    re.compile(r"(?<![\u0600-\u06FF])(?:نم\s+ی|م\s+ی)(?=\S)"),
    re.compile(r"(?<![\u0600-\u06FF])بی\s+نالملل"),
    re.compile(r"(?<![\u0600-\u06FF])میا\s+نرشت|(?<![\u0600-\u06FF])نرشت"),
    *(re.compile(re.escape(item)) for item in BROKEN_JOINS),
)


def find_spacing_artifacts(value: str) -> list[str]:
    """Return known broken fragments still present in a text."""
    return [match.group(0) for pattern in ARTIFACT_PATTERNS for match in pattern.finditer(value)]
