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


if __name__ == "__main__":
    unittest.main()
