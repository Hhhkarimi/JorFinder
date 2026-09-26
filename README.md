# JorFinder / مجله‌یاب

جست‌وجو و مقایسهٔ ۹۷۰ نشریهٔ علمی از فایل مرجع ۴۹۷ صفحه‌ای. بستهٔ داده شامل یک ردیف یادداشت منبع نیز هست که در نتایج نشریات نمایش داده نمی‌شود.

## داده و پیوندها

نسخهٔ کامل استخراج فایل ارسالی، با همهٔ ۲۲ فیلد هر رکورد (از جمله متن اهداف، مقادیر خام و صفحات منبع)، در `data/catalog-*.txt` ذخیره شده است. `data/catalog-manifest.json` تعداد ردیف‌ها و SHA-256 محتوای بازشده را مشخص می‌کند. مرورگر باید از `DecompressionStream` پشتیبانی کند؛ خطای بارگذاری دادهٔ کامل به‌جای نمایش مجموعهٔ ناقص نشان داده می‌شود. کاربر می‌تواند JSON کامل را از خود سایت دریافت کند؛ برای نشریات، این خروجی دو فیلد مشتق‌شدهٔ `journal_url` و `journal_url_type` نیز دارد.

پیوند برای همهٔ نشریات در رابط موجود است. نشریاتی که صفحهٔ مستقیم آن‌ها شناسایی شده با «وب‌سایت» مشخص می‌شوند؛ برای سایر عنوان‌ها لینک جست‌وجوی دقیق در دامنهٔ ناشر یا وب ارائه می‌شود و به‌عنوان صفحهٔ رسمی معرفی نمی‌شود. نگاشت صفحه‌های مستقیم در `DIRECT_URLS` داخل `app.js` است. نمونه‌های بررسی‌شده: [Elsevier](https://www.sciencedirect.com/journal/learning-and-instruction)، [APA](https://www.apa.org/pubs/journals/edu)، [SAGE](https://journals.sagepub.com/home/RER)، [Taylor & Francis](https://www.tandfonline.com/journals/hedp20)، [Wiley](https://onlinelibrary.wiley.com/journal/10.1111/(ISSN)1365-2729) و [SoLAR](https://www.solaresearch.org/publications/journal/). آمار داوری/نمایه از فایل مرجع است و نباید دادهٔ زنده تلقی شود.

برای تولید دوبارهٔ بسته با فایل JSON استخراج‌شده:

```bash
python3 scripts/build_catalog.py /path/to/magazines.json
```

خروجی بدون وابستگی خارجی تولید می‌شود و برابری داده‌ها با SHA-256 قابل بررسی است.

## Deploy on Vercel

این پروژه یک سایت استاتیک است و Build Step ندارد.

1. ریپوی `Hhhkarimi/JorFinder` را در Vercel Import کنید.
2. Framework Preset را روی **Other** بگذارید.
3. Root Directory را روی `./` نگه دارید.
4. Build Command و Output Directory را خالی بگذارید.
5. Deploy را بزنید.

فایل `index.html` در ریشه قرار دارد. داده‌های کامل از قطعات `data/catalog-*.txt` خوانده می‌شوند؛ تعداد قطعات از manifest گرفته می‌شود. فایل‌های قدیمی `packed-*.txt` دیگر در رابط استفاده نمی‌شوند.
