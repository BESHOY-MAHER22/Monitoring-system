# 📱 مشروع فلاتر | Flutter Attendance & Task Management App
### أسرة الأنبا أرسانيوس والقديس نيقولاوس لوسائل الإيضاح

مشروع متكامل متعدد المنصات (Flutter Multi-Platform) يعمل بكفاءة على:
- 🌐 متصفح الويب (Chrome / Edge / Firefox)
- 💻 أجهزة الكمبيوتر (Windows Desktop / macOS / Linux)
- 📱 الهواتف الذكية (Android / iOS)

---

## 🏛️ الهيكل المعماري البرمجي (Clean & Scalable Architecture)

تم تقسيم المشروع باحترافية لتسهيل الصيانة والتطوير المستقبلي:

```text
flutter_attendance_app/
│
├── lib/
│   ├── constants/             # الثوابت المركزية (الألوان، العناوين، إعدادات الثيم)
│   │   ├── app_colors.dart    # نظام الألوان الموحد متوافق مع Material 3
│   │   └── app_constants.dart # النصوص والمعايير الحسابية ومعدلات الـ Overload
│   │
│   ├── models/                # نماذج البيانات (Strongly-Typed Data Entities)
│   │   ├── person.dart        # بيانات المخدوم/الخادم مع حسابات الحضور والغياب
│   │   ├── church_task.dart   # المهام والتكليفات وحالات الإنجاز
│   │   ├── church_event.dart  # المناسبات والأحداث والمسؤوليات
│   │   └── attendance_record.dart # سجلات الحضور اليومية
│   │
│   ├── services/              # طبقة الخدمات وإدارة الحالة (State Management)
│   │   ├── attendance_service.dart # المزود الرئيسي (ChangeNotifier Provider)
│   │   ├── export_service.dart     # تصدير التقارير (Excel CSV & PDF)
│   │   └── mock_data.dart          # قاعدة البيانات الأولية مع إمكانية ربط REST API
│   │
│   ├── screens/               # واجهات التطبيق الرئيسية (UI Views)
│   │   ├── dashboard_screen.dart        # لوحة القيادة والمؤشرات العامة
│   │   ├── tasks_screen.dart            # شاشة إدارة وتوزيع المهام
│   │   ├── events_screen.dart           # شاشة الأحداث وحساب مؤشرات الضغط
│   │   ├── person_analytics_screen.dart # الملف التحليلي الشامل لكل شخص
│   │   ├── quick_attendance_dialog.dart # نافذة التسجيل السريع للحضور
│   │   └── export_dialog.dart           # نافذة خيارات التصدير والطباعة
│   │
│   ├── widgets/               # مكونات قابلة لإعادة الاستخدام (Reusable Widgets)
│   │   ├── executive_kpi_card.dart      # بطاقات المؤشرات التنفيذية التفاعلية
│   │   ├── person_card.dart             # بطاقة الشخص وسجل حضوره ومهامه
│   │   └── admin_question_solver_view.dart # حلول ذكية لأسئلة الإدارة (الأكثر غياباً، الافتقاد)
│   │
│   └── main.dart              # نقطة البداية، إعداد اللغة العربية RTL وثيم التطبيق
│
├── web/                       # ملفات تشغيل نسخة الويب
│   ├── index.html             # صفحة البداية مع مؤشر تحميل أنيق
│   └── manifest.json          # دعم تطبيقات الويب التقدمية (PWA)
│
├── run_web.bat                # تشغيل سريع بضغطة زر على متصفح Chrome
├── run_windows.bat            # تشغيل سريع كتطبيق مكتبي Windows
└── pubspec.yaml               # مكتبات وحزم فلاتر المعتمدة
```

---

## 🚀 كيفية تشغيل المشروع على جهازك (Windows CMD / PowerShell)

### 1. عبر السكربت المباشر:
- اضغط مرتين على ملف `run_web.bat` ليقوم بتنظيف الكاش وتشغيل Chrome تلقائياً.

### 2. عبر سطر الأوامر يدويًا:
افتح موجه الأوامر (CMD) داخل مجلد `flutter_attendance_app` ونفّذ:

```cmd
flutter clean
flutter pub get
flutter run -d chrome
```

### 3. لتشغيل التطبيق على الهاتف (Android):
وصل هاتفك عبر كابل USB ثم نفّذ:
```cmd
flutter run -d android
```

### 4. لتشغيل التطبيق على نظام Windows مباشرة:
```cmd
flutter run -d windows
```

---

## 🛠️ أبرز الإصلاحات والتحسينات المطبقة:
1. **التوافق الكامل مع إصدارات Flutter الحديثة (Material 3)**:
   - استخدام `CardThemeData` بدلاً من `CardTheme` داخل `ThemeData`.
   - استخدام `BoxConstraints(maxHeight: ...)` داخل الحاويات لتجنب أي تعارض.
2. **فصل الثوابت (Separation of Concerns)**:
   - توحيد جميع الألوان في `AppColors` وجميع النصوص والمعايير في `AppConstants`.
3. **أمان واجهات RTL**:
   - دعم كامل للغة العربية ومطابقة الهوية البصرية الكنسية لوسائل الإيضاح.
