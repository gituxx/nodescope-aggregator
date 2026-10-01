# NodeScope

**فهرست عمومی گره‌های پراکسی با نمایش منبع، مکان و شواهد اتصال.** NodeScope فیدها و پیکربندی‌های عمومی را گردآوری می‌کند و امکان جست‌وجو و ساخت اشتراک بر اساس پروتکل، منطقه و کشور را می‌دهد. این پروژه یک فهرست داده است، نه ارائه‌دهندهٔ VPN؛ سرورهای فهرست‌شده را اداره یا تأیید نمی‌کند.

**زبان‌ها:** [English](README.md) · [简体中文](README.zh-CN.md) · فارسی · [Русский](README.ru.md) · [မြန်မာ](README.my.md)

وب‌سایت: [node.oinnn.top](https://node.oinnn.top/) · [دانلودها](https://node.oinnn.top/fa/downloads/) · [پیشنهاد منبع](https://github.com/gituxx/nodescope-aggregator/issues/new?title=%5BSource%5D%20)

## امکانات

- گردآوری پیکربندی‌های عمومی VLESS، VMess، Shadowsocks، Trojan و پروتکل‌های پشتیبانی‌شدهٔ دیگر.
- جست‌وجو و فیلتر بر اساس پروتکل، منطقه، کشور، وضعیت گزارش‌شده و تأخیر اتصال ورودی.
- ساخت اشتراک برای همهٔ گره‌ها، ۱۰۰ گزینهٔ برتر، یک منطقه، یک کشور یا ترکیبی از فیلترها؛ با قالب Base64 یا URI خام.
- کپی جداگانهٔ URI هر گره؛ API عمومی فهرست، پیکربندی خام و اطلاعات احراز هویت را برنمی‌گرداند.
- نمایش سلامت منابع و توضیح منشأ و محدودیت اطلاعات مکان، وضعیت و تأخیر.
- فهرست چندزبانهٔ کلاینت‌های متن‌باز دسکتاپ و موبایل با پیوند به انتشار رسمی.

## گردآوری چندمسیره و پایداری

گردآورنده از مسیرهای مستقل استفاده می‌کند تا ازکارافتادن یک مخزن باعث توقف کل فهرست نشود:

- تجمیع‌کننده‌ها و مخازن عمومی GitHub، از جمله [MatinGhanbari/v2ray-configs](https://github.com/MatinGhanbari/v2ray-configs)، [0xRadikal/Free-v2ray-Configs](https://github.com/0xRadikal/Free-v2ray-Configs)، [Alirewa/V2ray-Configs](https://github.com/Alirewa/V2ray-Configs)، [freenodess/freenodess](https://github.com/freenodess/freenodess)، [morpheusadam/v2ray-config](https://github.com/morpheusadam/v2ray-config)، [yuesuizhengrong/proxy-node-collector](https://github.com/yuesuizhengrong/proxy-node-collector)، [Nexus-nodes](https://github.com/ninjastrikers/Nexus-nodes)، [Au1rxx/free-vpn-subscriptions](https://github.com/Au1rxx/free-vpn-subscriptions) و [Free-Nodes](https://github.com/735754647/Free-Nodes).
- فهرست عمومی [OpenProxyList](https://openproxylist.com/)، آینهٔ عمومی کانال تلگرام [mfbpn/tg_mfbpn_sub](https://github.com/mfbpn/tg_mfbpn_sub) و فید اشتراک عمومی FreeNodeBiz.
- فیدهای کشوری برای ژاپن، کرهٔ جنوبی، ایالات متحده، هنگ‌کنگ، سنگاپور، تایوان، استرالیا، هند، کانادا، بریتانیا، آلمان، فرانسه و هلند.
- خواندن اشتراک Base64 و URI خام، پراکسی‌های Clash YAML و متن RSS/Atom؛ سپس حذف موارد تکراری بر اساس شناسهٔ گره.

Cloudflare Worker هر چهار ساعت فیدها را تازه می‌کند و هر دو دقیقه حداکثر ۲۰ ورودی TCP یکتا را می‌آزماید. در صورت شکست GitHub Raw، دریافت از jsDelivr دوباره امتحان می‌شود و ظرفیت گردآوری بین مالکان پروژه تقسیم می‌شود. داده و نتیجهٔ آزمون‌ها در Cloudflare KV ذخیره می‌شوند. اگر snapshot زمان‌بندی‌شده موجود نباشد، Pages Function می‌تواند گردآوری درخواستی انجام دهد. شکست به‌روزرسانی یا افت شدید تعداد گره‌ها باعث حفظ آخرین snapshot سالم، ثبت خطا و محدودکردن تلاش مجدد می‌شود. snapshot کهنه تا هفت روز قابل ارائه است؛ نتیجهٔ هر آزمون پس از ۱۲ ساعت منقضی می‌شود.

منابع تازه از طریق GitHub Issue پیشنهاد و پیش از فعال‌سازی بررسی می‌شوند؛ URL ارسالی کاربر به‌طور خودکار دریافت نمی‌شود.

## معنی وضعیت و مکان

- `reachable`: Cloudflare توانسته اتصال TCP به میزبان و درگاه ورودی برقرار کند. این نتیجه handshake پراکسی، احراز هویت، مسیریابی یا خروجی را نمی‌آزماید.
- `available`: پروژهٔ منبع، نتیجهٔ تازه‌ای از آزمون منتشر کرده است؛ این آزمون مستقل پروتکل توسط NodeScope نیست.
- `upstream`: منبع بالادستی گره را انتخاب یا علامت‌گذاری کرده است؛ اعتبارسنجی مستقل NodeScope محسوب نمی‌شود.
- `failed`: آزمون TCP ورودی شکست خورده است. مقصدهای شناخته‌شدهٔ محدودشده در Cloudflare و پروتکل‌های غیرقابل‌آزمون با TCP به‌صورت پشتیبانی‌نشده ثبت می‌شوند.
- `unknown` / `unsupported`: نتیجهٔ فعلی وجود ندارد یا روش آزمون برای آن مورد کاربرد ندارد.
- کشور ممکن است از گزارش IP خروجی منبع، فید کشوری، نام گره یا مکان‌یابی IP ورودی استخراج شود. **کشور IP ورودی، کشور خروجی پراکسی نیست.** صفحه منشأ هر برچسب را نشان می‌دهد.
- تأخیر فقط زمان اتصال TCP از Cloudflare تا ورودی است؛ تأخیر انتهابه‌انتها یا تضمین کیفیت نیست.

## API اشتراک

```text
GET /api/subscription?format=base64&profile=all
GET /api/subscription?format=plain&profile=best100
GET /api/subscription?format=base64&profile=all&protocol=VLESS&region=apac&country=JP&country=KR
```

`format`: مقدار `base64` یا `plain`. `profile`: مقدار `all`، `best100`، `apac`، `west` یا کد کشوری موجود در snapshot. `region`: مقدار `apac`، `europe`، `americas` یا `west`. پارامترهای تکراری `protocol` و `country` پشتیبانی می‌شوند؛ فیلترهای انتخاب‌شده با هم اشتراک گرفته می‌شوند. برای پیوندهای قدیمی می‌توان کد کشور را به شکل `profile=JP` نیز فرستاد.

مسیرهای دیگر: `GET /api/nodes` فراداده و سلامت منبع را بدون URI خام برمی‌گرداند؛ `GET /api/node?index=N&version=SNAPSHOT_TIME` URI یک گره را برای کپی می‌دهد؛ `GET /api/stats` آمار خلاصه را می‌دهد.

## زبان‌ها، دانلود و SEO

صفحه‌ها در URL ثابت عرضه می‌شوند: `/` (چینی)، `/en/`، `/fa/`، `/ru/` و `/my/`؛ برای هر زبان صفحهٔ متناظر `/downloads/` نیز وجود دارد. فرایند build عنوان، توضیح، canonical، پیوندهای متقابل `hreflang`، دادهٔ ساخت‌یافته و sitemap چندزبانه تولید می‌کند. رابط فارسی راست‌به‌چپ است. هدایت اجباری بر اساس IP انجام نمی‌شود و زبان را می‌توان دستی انتخاب کرد.

صفحهٔ دانلود به انتشار رسمی v2rayN، Clash Verge Rev، FlClash، Hiddify، v2rayNG، NekoBox و Karing پیوند می‌دهد. پیش از نصب، نسخه و بسته را در مخزن رسمی پروژه بررسی کنید.

## توسعهٔ محلی و استقرار

به نسخهٔ جاری Node.js LTS و npm نیاز است:

```sh
npm install
npm run dev
npm run build
```

`npm run build` خروجی Cloudflare Pages را در `dist/` همراه با مسیرهای چندزبانه و `sitemap.xml` می‌سازد. برای اجرای محلی Pages Functions از `npm run dev:pages` استفاده کنید؛ `npm test` آزمون‌های Node را اجرا می‌کند.

وب‌سایت با Cloudflare Pages Direct Upload میزبانی می‌شود و گردآورنده یک Cloudflare Worker زمان‌بندی‌شده است. فضای KV با نام `NODESCOPE_DATA` را برای Pages و Worker تنظیم و دامنهٔ `node.oinnn.top` را به Custom domains پروژهٔ Pages اضافه کنید.

```sh
npx wrangler login
npm run build
npm run deploy:cloudflare
npm run deploy:collector
```

مخزن عمومی است. کلید API Cloudflare، توکن GitHub، URL خصوصی فید یا اعتبارنامهٔ اشتراک را ثبت نکنید. برای استقرار از نشست احراز هویت Wrangler یا secret محدوددسترسی استفاده کنید.

## امنیت و مجوز

گره‌های عمومی ممکن است توسط اشخاص ناشناس اداره، تغییر یا پایش شوند. از آن‌ها برای حساب کاربری، پرداخت، ارتباط خصوصی یا ترافیک حساس استفاده نکنید. از قوانین و مقررات شبکهٔ محل خود پیروی کنید. NodeScope دسترس‌پذیری، حریم خصوصی، ناشناس‌بودن یا امنیت را تضمین نمی‌کند. مجوز پروژه MIT است؛ [LICENSE](LICENSE) را ببینید.
