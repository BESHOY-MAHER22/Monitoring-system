# ⛪ نظام متابعة الحضور والمهام | أسرة الأنبا أرسانيوس والقديس نيقولاوس
### خدمة وسائل الإيضاح - الهيكل البرمجي الموحد والشامل

تم تنظيم وهيكلة مساحة العمل بالكامل وفق أحدث المعايير البرمجية الاحترافية (Clean Architecture & Modular Separation) ليحتوي المستودع على **مشروعين مستقلين ومنظمين بدقة عالية**:
1. **`html_web_app`**: تطبيق الويب الكامل (HTML5 / Tailwind CSS / Vanilla JS).
2. **`flutter_mobile_app`**: تطبيق فلاتر متعدد المنصات (Flutter Web, Mobile & Desktop).

---

## 📂 الهيكل العام لمساحة العمل (Workspace Structure)

```text
/ (مستودع المشروع الرئيسي)
│
├── 📱 flutter_mobile_app/          # [1] مشروع فلاتر (Flutter Multi-Platform App)
│   ├── lib/                        # كود فلاتر المنظم معمارياً
│   │   ├── constants/              # الثوابت الموحدة (AppColors, AppConstants)
│   │   ├── models/                 # نماذج البيانات (Person, ChurchTask, ChurchEvent, AttendanceRecord)
│   │   ├── services/               # إدارة الحالة والخدمات (AttendanceService, ExportService)
│   │   ├── screens/                # شاشات التطبيق (Dashboard, Tasks, Events, Analytics, Dialogs)
│   │   ├── widgets/                # المكونات البرمجية القابلة لإعادة الاستخدام
│   │   └── main.dart               # نقطة الانطلاق مع إعداد ثيم Material 3 والعربية RTL
│   ├── web/                        # إعدادات ويب فلاتر وmanifest.json
│   ├── run_web.bat                 # تشغيل فوري بضغطة زر على متصفح Chrome
│   ├── run_windows.bat             # تشغيل فوري كتطبيق مكتبي Windows
│   ├── pubspec.yaml                # ملف الحزم والتبعيات
│   └── README.md                   # دليل تشغيل وصيانة مشروع فلاتر
│
├── 🌐 html_web_app/                # [2] مشروع الويب المستقل (HTML5 / JS / CSS)
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

## 🚀 دليل تشغيل كل مشروع على حدة (Running Each Version Separately)

### 1️⃣ كيفية تشغيل تطبيق الويب (`html_web_app`)

#### الطريقة الأولى: التشغيل التلقائي بضغطة زر (ويندوز)
- افتح مجلد `html_web_app` وانقر نقراً مزدوجاً على ملف:
  **`run_local.bat`**
- سيقوم السكربت بتشغيل الخادم المحلي وفتح المتصفح تلقائياً على الرابط: `http://localhost:3000`

#### الطريقة الثانية: عبر موجه الأوامر (CMD / Terminal)
من المجلد الرئيسي للمشروع:
```cmd
npm install
npm run dev
```
ثم افتح المتصفح على: `http://localhost:3000`

#### الطريقة الثالثة: بدون خادم (مباشرة)
- يمكنك فتح `html_web_app/index.html` مباشرة بالنقر المزدوج في أي متصفح ويب.

---

### 2️⃣ كيفية تشغيل تطبيق فلاتر (`flutter_mobile_app`)

#### الطريقة الأولى: التشغيل التلقائي بضغطة زر (ويندوز)
ادخل إلى مجلد `flutter_mobile_app` وانقر نقراً مزدوجاً على أحد الملفين:
- **`run_web.bat`** : لتشغيل التطبيق على متصفح Google Chrome كـ Web App.
- **`run_windows.bat`** : لتشغيل التطبيق كبرنامج مكتبي مستقل على نظام Windows.

#### الطريقة الثانية: عبر موجه الأوامر (CMD)
```cmd
cd flutter_mobile_app
flutter clean
flutter pub get
flutter run -d chrome
```
*أو للتشغيل كتطبيق ويندوز مكتبي:*
```cmd
flutter run -d windows
```

> **ملاحظة:** تم حل وتعديل كافة أخطاء تعارض Material 3 السابقة (`CardThemeData` و `BoxConstraints`)، وأصبح الكود متوافقاً تماماً مع أحدث إصدارات Flutter 3.x.

---

## ✅ نتائج الفحص والاختبار (Verification Results)
- **Code Linting:** تم فحص ملفات الجافاسكريبت وDart وتأكيد خلوها من الأخطاء النحوية والتعارضات.
- **Server APIs:** خادم Express يعمل بانتظام ويخدم مجلد `html_web_app` مع توفير كافة الـ APIs (كود الاستجابة HTTP 200).
- **Compilation:** جاهز للعمل والنشر بدون مشاكل بناء.
