---
version: alpha
name: راهنمای نشریات علوم انسانی
description: الگوی بصری فهرست و پیشنهاد نشریات علوم انسانی
colors:
  navy: "#071f2a"
  ink: "#102e37"
  muted: "#61777c"
  paper: "#f3f7f6"
  surface: "#ffffff"
  surface-2: "#eaf3f0"
  line: "#d3e0dd"
  line-strong: "#a9c0bb"
  teal: "#087c69"
  mint: "#59e3c4"
typography:
  vazirmatn:
    fontFamily: Vazirmatn
rounded:
  base: 18px
---

## Hallmark system

- Genre: modern-minimal
- Macrostructure: Index-First؛ ابزار کشف و فهرست نتایج بر روایت تبلیغاتی تقدم دارد.
- Navigation: N9 Edge-aligned minimal
- Footer: Ft2 Inline single line
- Motion: فقط بازخورد فشار و جابه‌جایی دوپیکسلی کارت؛ بدون reveal و با پشتیبانی از reduced motion
- Spacing: مقیاس نام‌گذاری‌شدهٔ ۴ پیکسلی در `tokens.css`
- Typography: Vazirmatn برای display و body؛ عنوان‌ها همیشه roman

## Overview

این وب‌اپ فهرست نشریات علوم انسانی را برای جست‌وجو، مقایسه و پیشنهاد بر پایهٔ متن مقاله در دسترس قرار می‌دهد. خوانایی اطلاعات نشریه و مشخص‌بودن منبع داده، مسیرهای اصلی نمایش هستند.

## Colors

از رنگ سرمه‌ای برای پس‌زمینهٔ سربرگ و کنش اصلی، و از سبز تیره برای برچسب‌ها و پیوندهای درون محتوا استفاده کنید. سطح کارت‌ها را روشن نگه دارید تا متن‌های بلند حوزهٔ نشریه خوانا بمانند.

## Typography

قلم Vazirmatn را برای متن فارسی و کنترل‌های صفحه به کار ببرید. عنوان انگلیسی نشریات و نام ناشر را در جهت چپ به راست نمایش دهید؛ متن ورودی مقاله جهت خودکار داشته باشد.

## Layout

جست‌وجو و پیشنهاد را در دو پنل زیر یک ناوبری تب قرار دهید. در پنل جست‌وجو، فیلترها پیش از نتایج و در پنل پیشنهاد، فرم پیش از دلایل رتبه‌بندی قرار می‌گیرد. در عرض کم، فیلترها و کارت‌ها در یک ستون قرار بگیرند و هر دو تب به‌طور هم‌زمان دیده شوند.

## Components

کنش اصلی هر پنل از دکمهٔ پررنگ موجود استفاده کند. وضعیت انتخاب‌شدهٔ تب را با پس‌زمینهٔ سرمه‌ای مشخص کنید و برای هر تب، نام و حالت فعال را به فناوری کمکی اعلام کنید. جزئیات هر نشریه در گفت‌وگوی فعلی و با تب‌های داخل آن نمایش داده شود.

## Exports

`tokens.css` منبع اصلی و قابل‌استفادهٔ مستقیم است. نگاشت‌های زیر برای انتقال سیستم به ابزارهای دیگر نگهداری می‌شوند.

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper: oklch(97% 0.008 180);
  --color-ink: oklch(22% 0.045 205);
  --color-accent: oklch(50% 0.105 170);
  --color-focus: oklch(62% 0.16 165);
  --font-display: Vazirmatn, sans-serif;
  --font-body: Vazirmatn, sans-serif;
  --spacing-md: 1.5rem;
  --radius-card: 0.75rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### DTCG `tokens.json`

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(97% 0.008 180)", "$type": "color" },
    "ink": { "$value": "oklch(22% 0.045 205)", "$type": "color" },
    "accent": { "$value": "oklch(50% 0.105 170)", "$type": "color" },
    "focus": { "$value": "oklch(62% 0.16 165)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Vazirmatn, sans-serif", "$type": "fontFamily" },
    "body": { "$value": "Vazirmatn, sans-serif", "$type": "fontFamily" }
  },
  "space": { "md": { "$value": "1.5rem", "$type": "dimension" } }
}
```

### shadcn/ui CSS variables

```css
:root {
  --background: 97% 0.008 180;
  --foreground: 22% 0.045 205;
  --primary: 50% 0.105 170;
  --primary-foreground: 99% 0.004 180;
  --muted: 88% 0.018 180;
  --muted-foreground: 52% 0.025 185;
  --border: 88% 0.018 180;
  --input: 72% 0.028 180;
  --ring: 62% 0.16 165;
  --radius: 0.75rem;
}
```
