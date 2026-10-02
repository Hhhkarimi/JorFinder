import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from persian_text import find_spacing_artifacts, repair_persian_text


class PersianTextRepairTest(unittest.TestCase):
    def test_repairs_real_catalogue_examples(self):
        source = (
            "این مجله بی نالمللی پژوه شهای میا نرشت های را منتشر م یکند و "
            "به سیاس تهای آموزشی و روا نشناسی تربیتی م یپردازد."
        )
        repaired = repair_persian_text(source)
        self.assertEqual(
            repaired,
            "این مجله بین\u200cالمللی پژوهش\u200cهای میان\u200cرشته\u200cای را منتشر "
            "می\u200cکند و به سیاست\u200cهای آموزشی و روانشناسی تربیتی می\u200cپردازد.",
        )
        self.assertEqual(find_spacing_artifacts(repaired), [])

    def test_preserves_real_word_boundaries(self):
        source = "این مجله در مورد آموزش و پژوهش در علوم انسانی است."
        self.assertEqual(repair_persian_text(source), source)

    def test_repairs_all_suffix_seams_from_reported_aims_text(self):
        source = (
            "توصی فها یا ارزیاب یهای سیاست یا عمل که فاقد تحلیل انتقادی و نظریهستند "
            "مطالعات موردی محلی که زمینهسازی نشد هاند یا ارتباط بین‌المللی گسترد هتری "
            "ارائه نمی دهند نظرسنج یهای در مقیاس بزرگ که مبتنی بر تحلیل انتقادی و نظری "
            "نیستند تحلی لهای کتا بسنجی یا محتوا پیشنهادهای ناخواسته برای ویراستاری "
            "مهمان یا شمار ههای ویژه نیز پذیرفته نخواهند شد."
        )
        repaired = repair_persian_text(source)
        self.assertEqual(
            repaired,
            "توصیف‌ها یا ارزیابی‌های سیاست یا عمل که فاقد تحلیل انتقادی و نظری هستند "
            "مطالعات موردی محلی که زمینه‌سازی نشده‌اند یا ارتباط بین‌المللی گسترده‌تری "
            "ارائه نمی‌دهند نظرسنجی‌های در مقیاس بزرگ که مبتنی بر تحلیل انتقادی و نظری "
            "نیستند تحلیل‌های کتاب‌سنجی یا محتوا پیشنهادهای ناخواسته برای ویراستاری "
            "مهمان یا شماره‌های ویژه نیز پذیرفته نخواهند شد.",
        )
        self.assertEqual(find_spacing_artifacts(repaired), [])

    def test_repairs_compound_word_seams_across_subjects(self):
        source = (
            "زیبای یشناسی، جامع هشناختی، عالق همند، چش مانداز، روزنام هنگاری، "
            "زیس تمحیطی، اطال عرسانی، بی ن‌رشته‌ای و طبق هبندی"
        )
        self.assertEqual(
            repair_persian_text(source),
            "زیبایی‌شناسی، جامعه‌شناختی، علاقه‌مند، چشم‌انداز، روزنامه‌نگاری، "
            "زیست‌محیطی، اطلاع‌رسانی، بین‌رشته‌ای و طبقه‌بندی",
        )


if __name__ == "__main__":
    unittest.main()
