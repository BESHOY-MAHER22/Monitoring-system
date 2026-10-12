# 📱 مشروع فلاتر | Flutter Attendance & Task Management App
### أسرة الأنبا أرسانيوس والقديس نيقولاوس لوسائل الإيضاح

مشروع متكامل متعدد المنصات (Flutter Multi-Platform) مبني بأحدث معايير **Liquid Glass** الزجاجي الملكي المستوحى من ألوان شعار الخدمة، ويعمل بكفاءة على:
- 🌐 متصفح الويب (Chrome / Edge / Firefox)
- 💻 أجهزة الكمبيوتر (Windows Desktop / macOS / Linux)
- 📱 الهواتف الذكية (Android / iOS)

---

## 🏛️ الهيكل المعماري البرمجي (Clean & Scalable Architecture)

تم تقسيم المشروع باحترافية لتسهيل الصيانة والتطوير المستقبلي:

```text
flutter_mobile_app/
│
├── lib/
│   ├── constants/             # الثوابت المركزية وتدرجات Liquid Glass (AppColors, AppConstants)
│   │   ├── app_colors.dart    # نظام الألوان وتدرجات الزجاج السائل والأوضاع الليلية والنهارية
│   │   └── app_constants.dart # النصوص والمعايير الحسابية ومعدلات الـ Overload
│   │
│   ├── models/                # نماذج البيانات (Strongly-Typed Data Entities)
│   │   ├── person.dart        # بيانات المخدوم/الخادم مع حسابات الحضور والغياب
│   │   ├── church_task.dart   # المهام والتكليفات وحالات الإنجاز
│   │   ├── church_event.dart  # المناسبات والأحداث والمسؤوليات
│   │   └── attendance_record.dart # سجلات الحضور اليومية
│   │
│   ├── services/              # طبقة الخدمات وإدارة الحالة (State Management)
│   │   ├── attendance_service.dart # المزود الرئيسي (Provider: Theme, Language, Search, CRUD)
│   │   ├── export_service.dart     # تصدير التقارير (Excel CSV & PDF)
│   │   └── mock_data.dart          # قاعدة البيانات الأولية مع إمكانية ربط REST API
│   │
│   ├── screens/               # واجهات التطبيق الرئيسية (UI Views)
│   │   ├── dashboard_screen.dart        # لوحة القيادة: ترويسة زجاجية وشعار قابل للطي وبحث فوري
│   │   ├── tasks_screen.dart            # شاشة إدارة وتوزيع المهام
│   │   ├── events_screen.dart           # شاشة الأحداث وحساب مؤشرات الضغط والـ Overload
│   │   ├── person_analytics_screen.dart # الملف التحليلي الشامل لكل شخص
│   │   ├── quick_attendance_dialog.dart # نافذة التسجيل السريع للحضور
│   │   └── export_dialog.dart           # نافذة خيارات التصدير والطباعة
│   │
│   ├── widgets/               # مكونات زجاجية قابلة لإعادة الاستخدام (Reusable Widgets)
│   │   ├── executive_kpi_card.dart      # بطاقات المؤشرات التنفيذية الزجاجية
│   │   ├── person_card.dart             # بطاقة الشخص بتأثير Liquid Glass
│   │   └── admin_question_solver_view.dart # حلول ذكية لأسئلة الإدارة (الأكثر غياباً، الافتقاد)
│   │
│   └── main.dart              # نقطة البداية، دعم الوضعين الليلي والنهاري وتعدد اللغات RTL/LTR
│
├── assets/                    # أصول وصور فلاتر
│   └── logo.png               # الشعار الكنسي الرسمي
│
├── web/                       # ملفات تشغيل نسخة الويب
│   ├── index.html             # صفحة البداية مع مؤشر تحميل أنيق
│   └── manifest.json          # دعم تطبيقات الويب التقدمية (PWA)
│
├── run_web.bat                # تشغيل سريع بضغطة زر على متصفح Chrome
├── run_windows.bat            # تشغيل سريع كتطبيق مكتبي Windows
├── pubspec.yaml               # مكتبات وحزم فلاتر المعتمدة والأصول
└── README.md                  # الدليل الشامل لمشروع فلاتر
```

---

## 🌟 الميزات الزجاجية والتفاعلية المنفذة

1. **Liquid Glass Design:**
   - تأثيرات الزجاج المصنفر (`BackdropFilter`) مع حدود ذهبية وانعكاسات ضوئية دقيقة متناغمة مع الشعار.
2. **الترويسة القابلة للطي (Collapsible Logo Header):**
   - عبر `CustomScrollView` و`SliverAppBar` ذكي، يتقلص الشعار ويختفي بنعومة مع التمرير.
   - يضم شريط التحكم: الوضع الليلي/النهاري، تبديل اللغة (عربي / إنجليزي)، وحالة الاتصال.
3. **البحث السريع في بطاقات الأشخاص:**
   - تصفية فورية للقائمة بناءً على اسم الشخص أثناء الكتابة مباشرة، مع عداد وإمكانية الإلغاء السريع.

---

## 🚀 كيفية تشغيل المشروع على جهازك (Windows CMD / PowerShell)

### لتشغيل نسخة الويب (Web Chrome):
```cmd
cd flutter_mobile_app
flutter pub get
flutter run -d chrome
```
أو انقر نقراً مزدوجاً على **`run_web.bat`**.

### لتشغيل نسخة الكمبيوتر المكتبية (Windows Desktop):
```cmd
cd flutter_mobile_app
flutter pub get
flutter run -d windows
```
أو انقر نقراً مزدوجاً على **`run_windows.bat`**.

### لتشغيل نسخة الجوال (Android):
```cmd
cd flutter_mobile_app
flutter run
```
