/// الثوابت العامة للنظام الكنسي لإدارة الحضور والمهام
class AppConstants {
  AppConstants._();

  static const String appTitle = 'نظام المتابعة الكنسية';
  static const String churchFamilyName = 'أسرة الأنبا أرسانيوس والقديس نيقولاوس';
  static const String serviceName = 'خدمة وسائل الإيضاح';
  static const String appSubtitle = 'متابعة الحضور، إسناد المهام، وإدارة مؤشرات الـ Overload';
  static const String appVersion = '1.0.0';

  // الخطوط الافتراضية
  static const String fontFamily = 'Cairo';

  // مفاتيح التبويبات الرئيسية
  static const String tabDashboard = 'لوحة المتابعة';
  static const String tabTasks = 'المهام والأنشطة';
  static const String tabEvents = 'الأحداث والمناسبات';
  static const String tabAnalytics = 'تحليلات الأفراد';

  // معايير حساب الـ Overload
  static const int normalOverloadThreshold = 3;
  static const int highOverloadThreshold = 5;
}
