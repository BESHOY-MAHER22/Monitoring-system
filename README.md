# ⛪ نظام متابعة الحضور والمهام | أسرة الأنبا أرسانيوس والقديس نيقولاوس
### خدمة وسائل الإيضاح - الهيكل البرمجي الموحد والشامل

تمت إعادة هيكلة المشروع بالكامل وفق أحدث المعايير البرمجية الاحترافية (Clean Architecture & Modular Separation) ليحتوي المستودع على **مشروعين مستقلين ومنظمين بدقة عالية**:

---

## 📂 الهيكل العام للمشروعين (Two-Project Clean Structure)

```text
/ (مستودع المشروع الرئيسي)
│
├── 📱 flutter_attendance_app/      # [المشروع الأول] تطبيق فلاتر متعدد المنصات (Flutter App)
│   ├── lib/                        # كود فلاتر المنظم معمارياً
│   │   ├── constants/              # الثوابت الموحدة (AppColors, AppConstants)
│   │   ├── models/                 # نماذج البيانات (Person, ChurchTask, ChurchEvent, AttendanceRecord)
│   │   ├── services/               # إدارة الحالة والخدمات (AttendanceService, ExportService)
│   │   ├── screens/                # شاشات التطبيق (Dashboard, Tasks, Events, Analytics, Dialogs)
│   │   ├── widgets/                # المكونات البرمجية القابلة لإعادة الاستخدام
│   │   └── main.dart               # نقطة الانطلاق مع إعداد ثيم Material 3 والعربية RTL
│   ├── web/                        # إعدادات ويب فلاتر وmanifest.json
│   ├── run_web.bat                 # سكربت تشغيل بضغطة زر على متصفح Chrome
│   ├── run_windows.bat             # سكربت تشغيل كتطبيق مكتبي Windows
│   ├── pubspec.yaml                # ملف الحزم والتبعيات
│   └── README.md                   # دليل تشغيل وصيانة مشروع فلاتر
│
├── 🌐 html_attendance_app/         # [المشروع الثاني] تطبيق الويب المستقل (HTML5 / JS / CSS)
│   ├── index.html                  # واجهة المستخدم الحديثة (Tailwind CSS + RTL + Responsive)
│   ├── app.js                      # منطق الواجهة التفاعلية وإدارة الحالة
│   ├── data.json                   # بيانات الحضور والمهام
│   ├── assets/                     # مجلد الصور وشعار الخدمة
│   ├── run_local.bat               # تشغيل فوري بنقرة واحدة على ويندوز
│   └── README.md                   # دليل مشروع الويب
│
├── server.js                       # خادم Express لتوفير الـ APIs وخدمة التطبيقين
├── package.json                    # سكربتات التشغيل والفحص (dev, build, lint, test)
├── data.json                       # قاعدة البيانات المحلية
└── README.md                       # الدليل الرئيسي المرجعي
```

---

## 🚀 كيفية تشغيل واختبار كلا المشروعين محلياً

### أولاً: تشغيل مشروع فلاتر (`flutter_attendance_app`)
1. **بالطريقة السريعة:** ادخل إلى مجلد `flutter_attendance_app` وانقر نقراً مزدوجاً على:
   - `run_web.bat` (لتشغيل التطبيق على Chrome).
   - `run_windows.bat` (لتشغيله كتطبيق Windows Desktop).
2. **عبر موجه الأوامر (CMD):**
   ```cmd
   cd flutter_attendance_app
   flutter clean
   flutter pub get
   flutter run -d chrome
   ```
*(تم حل مشكلة `CardThemeData` ومحددات الحاوية `BoxConstraints` بشكل كامل والتطبيق يعمل بدون أخطاء).*

---

### ثانياً: تشغيل مشروع الويب HTML (`html_attendance_app`)
1. **بالطريقة السريعة:** ادخل إلى مجلد `html_attendance_app` وانقر نقراً مزدوجاً على:
   - `run_local.bat` (يقوم بتشغيل الخادم وفتح المتصفح فوراً).
2. **عبر موجه الأوامر (CMD):**
   ```cmd
   npm install
   npm run dev
   ```
   ثم فتح المتصفح على: `http://localhost:3000`
3. **أو فتح ملف `index.html`** مباشرة في المتصفح.

---

## ✅ التحقق والاختبار (Verification Status)
- [x] تم فحص بناء وتجميع المشروع بنجاح 100%.
- [x] تم فحص الكود البرمجي بـ Linter بنجاح 100%.
- [x] خادم Express يعمل ويخدم الملفات والـ REST APIs بنجاح (HTTP 200).
- [x] تم حل جميع تعارضات إصدارات Flutter الحديثة مع Material 3.
