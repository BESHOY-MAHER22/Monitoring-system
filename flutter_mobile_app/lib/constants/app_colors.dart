import 'package:flutter/material.dart';

/// نظام الألوان الموحد وتأثيرات Liquid Glass (مستوحاة من ألوان الشعار الكنسي الملكي)
class AppColors {
  AppColors._();

  // الألوان الأساسية لشعار الخدمة (الذهبي والكهرماني والبني الملكي)
  static const Color primary = Color(0xFF966C34); 
  static const Color primaryDark = Color(0xFF6F4921);
  static const Color primaryLight = Color(0xFFB08142);
  static const Color secondary = Color(0xFFD4B16D);
  static const Color accent = Color(0xFFC49A45);

  // الوضع النهاري (Day Mode)
  static const Color lightScaffold = Color(0xFFF7F3EC);
  static const Color lightTextPrimary = Color(0xFF3D2B17);
  static const Color lightTextSecondary = Color(0xFF7D6850);
  static const Color lightGlassSurface = Color(0x99FFFFFF); // ~60% frosted white
  static const Color lightGlassBorder = Color(0x55D4B16D); // ~33% gold rim

  // الوضع الليلي (Night Mode)
  static const Color darkScaffold = Color(0xFF17110C);
  static const Color darkTextPrimary = Color(0xFFF7ECD7);
  static const Color darkTextSecondary = Color(0xFFBDA68C);
  static const Color darkGlassSurface = Color(0xAA241911); // ~66% deep amber night
  static const Color darkGlassBorder = Color(0x44D7AD5C); // ~27% soft gold glow

  // ألوان افتراضية عامة
  static const Color scaffoldBackground = Color(0xFFF7F3EC);
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
  static const Color textPrimary = Color(0xFF3D2B17);
  static const Color textSecondary = Color(0xFF7D6850);
  static const Color textMuted = Color(0xFF9E8E81);

  // تدرجات Liquid Glass
  static const LinearGradient liquidGlassHeaderLight = LinearGradient(
    colors: [Color(0xD9A97C42), Color(0xD9D4B16D)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient liquidGlassHeaderDark = LinearGradient(
    colors: [Color(0xE6302014), Color(0xD976542C)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient liquidGlassCardLight = LinearGradient(
    colors: [Color(0xB3FFFDF7), Color(0x99F7EDDB)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient liquidGlassCardDark = LinearGradient(
    colors: [Color(0xB32E2015), Color(0xC01C130D)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
