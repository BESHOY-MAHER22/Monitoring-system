import 'package:flutter/material.dart';

/// نظام الألوان الموحد لتطبيق المتابعة (Material 3 الهوية الكنسية الدافئة)
class AppColors {
  AppColors._();

  // الألوان الأساسية
  static const Color primary = Color(0xFF936B36); // ذهبي كنسي دافئ
  static const Color primaryDark = Color(0xFF6B4D21);
  static const Color primaryLight = Color(0xFFB88E52);
  static const Color secondary = Color(0xFFD4B16D);
  static const Color accent = Color(0xFFC49A45);

  // الخلفيات والأسطح
  static const Color scaffoldBackground = Color(0xFFF7F1E7); // كريمي مريح للعين
  static const Color cardSurface = Colors.white;
  static const Color surfaceWarm = Color(0xFFFFFDF9);
  static const Color divider = Color(0xFFEADBCE);

  // حالات الحضور والغياب (Status Colors)
  static const Color present = Color(0xFF2E7D32); // أخضر الحضور
  static const Color presentLight = Color(0xFFE8F5E9);
  static const Color absentUnexcused = Color(0xFFC62828); // أحمر الغياب بدون عذر
  static const Color absentUnexcusedLight = Color(0xFFFFEBEE);
  static const Color absentExcused = Color(0xFFEF6C00); // برتقالي الغياب بعذر
  static const Color absentExcusedLight = Color(0xFFFFF3E0);

  // مؤشرات الضغط والـ Overload
  static const Color overloadHigh = Color(0xFFD84315);
  static const Color overloadMedium = Color(0xFFF9A825);
  static const Color overloadNormal = Color(0xFF2E7D32);

  // النصوص
  static const Color textPrimary = Color(0xFF2B2118);
  static const Color textSecondary = Color(0xFF6E5D4F);
  static const Color textMuted = Color(0xFF9E8E81);
}
