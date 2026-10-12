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
    return MaterialApp(
      title: '${AppConstants.churchFamilyName} - ${AppConstants.appTitle}',
      debugShowCheckedModeBanner: false,
      locale: const Locale('ar', 'EG'),
      supportedLocales: const [
        Locale('ar', 'EG'),
        Locale('en', 'US'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: ThemeData(
        useMaterial3: true,
        fontFamily: AppConstants.fontFamily,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          primary: AppColors.primary,
          secondary: AppColors.secondary,
          surface: AppColors.surfaceWarm,
        ),
        scaffoldBackgroundColor: AppColors.scaffoldBackground,
        cardTheme: CardThemeData(
          color: AppColors.cardSurface,
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
        appBarTheme: const AppBarTheme(
          centerTitle: false,
          elevation: 1,
        ),
      ),
      home: const DashboardScreen(),
    );
  }
}
