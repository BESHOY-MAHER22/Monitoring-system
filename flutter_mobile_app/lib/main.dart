import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'constants/app_colors.dart';
import 'constants/app_constants.dart';
import 'screens/dashboard_screen.dart';
import 'services/attendance_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AttendanceService()),
      ],
      child: const AttendanceFlutterApp(),
    ),
  );
}

class AttendanceFlutterApp extends StatelessWidget {
  const AttendanceFlutterApp({super.key});

  @override
  Widget build(BuildContext context) {
    final service = Provider.of<AttendanceService>(context);

    final lightTheme = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      fontFamily: AppConstants.fontFamily,
      colorScheme: ColorScheme.fromSeed(
        brightness: Brightness.light,
        seedColor: AppColors.primary,
        primary: AppColors.primary,
        secondary: AppColors.secondary,
        surface: AppColors.lightGlassSurface,
      ),
      scaffoldBackgroundColor: AppColors.lightScaffold,
      cardTheme: CardThemeData(
        color: AppColors.cardSurface,
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
      appBarTheme: const AppBarTheme(
        centerTitle: false,
        elevation: 0,
      ),
    );

    final darkTheme = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      fontFamily: AppConstants.fontFamily,
      colorScheme: ColorScheme.fromSeed(
        brightness: Brightness.dark,
        seedColor: AppColors.accent,
        primary: AppColors.accent,
        secondary: AppColors.secondary,
        surface: AppColors.darkGlassSurface,
      ),
      scaffoldBackgroundColor: AppColors.darkScaffold,
      cardTheme: CardThemeData(
        color: AppColors.darkGlassSurface,
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
      appBarTheme: const AppBarTheme(
        centerTitle: false,
        elevation: 0,
      ),
    );

    return MaterialApp(
      title: '${AppConstants.churchFamilyName} - ${AppConstants.appTitle}',
      debugShowCheckedModeBanner: false,
      locale: service.currentLocale,
      themeMode: service.isDarkMode ? ThemeMode.dark : ThemeMode.light,
      theme: lightTheme,
      darkTheme: darkTheme,
      supportedLocales: const [
        Locale('ar', 'EG'),
        Locale('en', 'US'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: const DashboardScreen(),
    );
  }
}
