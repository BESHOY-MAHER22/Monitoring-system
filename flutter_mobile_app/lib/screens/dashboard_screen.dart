import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/app_colors.dart';
import '../services/attendance_service.dart';
import '../widgets/admin_question_solver_view.dart';
import '../widgets/executive_kpi_card.dart';
import '../widgets/person_card.dart';
import 'events_screen.dart';
import 'export_dialog.dart';
import 'person_analytics_screen.dart';
import 'quick_attendance_dialog.dart';
import 'tasks_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final service = Provider.of<AttendanceService>(context);
    final isDark = service.isDarkMode;
    final isArabic = service.currentLocale.languageCode == 'ar';

    final glassBorderColor = isDark ? AppColors.darkGlassBorder : AppColors.lightGlassBorder;
    final glassCardColor = isDark ? const Color(0x99241911) : const Color(0xB3FFFFFF);
    final primaryTextColor = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;

    final filteredPeopleList = service.filteredPeople;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkScaffold : AppColors.lightScaffold,
      body: CustomScrollView(
        slivers: [
          // Collapsible Liquid Glass App Bar with Logo in top section that collapses smoothly on scroll
          SliverAppBar(
            pinned: true,
            floating: false,
            expandedHeight: 260.0,
            elevation: 0,
            backgroundColor: isDark ? const Color(0xE6261A10) : const Color(0xE6966C34),
            flexibleSpace: LayoutBuilder(
              builder: (context, constraints) {
                // Calculate collapse percentage (0.0 = fully expanded, 1.0 = fully collapsed)
                final minHeight = MediaQuery.of(context).padding.top + kToolbarHeight;
                final maxHeight = 260.0;
                final currentHeight = constraints.maxHeight;
                final shrinkOffset = (maxHeight - currentHeight) / (maxHeight - minHeight);
                final collapseFactor = shrinkOffset.clamp(0.0, 1.0);
                final showFullLogo = collapseFactor < 0.6;
                final logoOpacity = (1.0 - collapseFactor * 1.6).clamp(0.0, 1.0);

                return FlexibleSpaceBar(
                  centerTitle: true,
                  titlePadding: const EdgeInsets.only(bottom: 12, left: 16, right: 16),
                  title: AnimatedOpacity(
                    duration: const Duration(milliseconds: 200),
                    opacity: collapseFactor > 0.4 ? 1.0 : 0.0,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.church, color: Color(0xFFF7ECD7), size: 18),
                        const SizedBox(width: 8),
                        Text(
                          isArabic ? 'أسرة الأنبا أرسانيوس ونيقولاوس' : 'St. Arsenius & St. Nicholas',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                  background: Container(
                    decoration: BoxDecoration(
                      gradient: isDark
                          ? AppColors.liquidGlassHeaderDark
                          : AppColors.liquidGlassHeaderLight,
                    ),
                    padding: EdgeInsets.only(
                      top: MediaQuery.of(context).padding.top + 10,
                      bottom: 16,
                      left: 16,
                      right: 16,
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Collapsible Church Logo at the top that disappears on scroll
                        if (showFullLogo)
                          Opacity(
                            opacity: logoOpacity,
                            child: Transform.scale(
                              scale: (1.0 - collapseFactor * 0.5).clamp(0.5, 1.0),
                              child: Container(
                                width: 84,
                                height: 84,
                                margin: const EdgeInsets.only(bottom: 8),
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFFFFF3DB), Color(0xFFD4B16D)],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  border: Border.all(color: Colors.white.withOpacity(0.8), width: 3),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.2),
                                      blurRadius: 16,
                                      offset: const Offset(0, 6),
                                    ),
                                  ],
                                ),
                                child: ClipOval(
                                  child: Image.asset(
                                    'logo.png',
                                    fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => const Center(
                                      child: Icon(Icons.church, size: 44, color: Color(0xFF6F4921)),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),

                        // Service Name directly beneath logo
                        Text(
                          isArabic
                              ? 'أسرة الأنبا أرسانيوس والقديس نيقولاوس'
                              : 'St. Arsenius and St. Nicholas Family',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            shadows: [
                              Shadow(color: Colors.black38, blurRadius: 4, offset: Offset(0, 1)),
                            ],
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          isArabic
                              ? 'خدمة وسائل الإيضاح ✝ متابعة الحضور والأحداث والمهام'
                              : 'Visual Aids Service ✝ Attendance, Events & Overload',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: Colors.amber.shade100,
                          ),
                        ),
                        const SizedBox(height: 10),

                        // Controls: Day/Night, Language, Account & Connection Status
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.18),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.white.withOpacity(0.25)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              // Connection Dot
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: Colors.greenAccent,
                                  boxShadow: [
                                    BoxShadow(color: Colors.greenAccent, blurRadius: 6),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                isArabic ? 'متصل' : 'Online',
                                style: const TextStyle(fontSize: 11, color: Colors.white70),
                              ),
                              const SizedBox(width: 14),

                              // Account Role & User Name Badge
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppColors.accent.withOpacity(0.3),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.verified_user, size: 12, color: Color(0xFFF7ECD7)),
                                    const SizedBox(width: 4),
                                    Text(
                                      isArabic ? 'مسؤول الخدمة' : 'Admin',
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),

                              // Night / Day Toggle
                              InkWell(
                                onTap: () => service.toggleTheme(),
                                borderRadius: BorderRadius.circular(16),
                                child: Padding(
                                  padding: const EdgeInsets.all(4),
                                  child: Icon(
                                    isDark ? Icons.light_mode : Icons.dark_mode,
                                    size: 18,
                                    color: isDark ? Colors.amberAccent : Colors.white,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),

                              // Language Toggle
                              InkWell(
                                onTap: () => service.toggleLocale(),
                                borderRadius: BorderRadius.circular(16),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  child: Text(
                                    isArabic ? '🇪🇬 عربي' : '🇬🇧 EN',
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.print_outlined),
                tooltip: 'تصدير التقارير الرسمية (CSV/PDF)',
                onPressed: () => showDialog(
                  context: context,
                  builder: (_) => const ExportDialog(),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.event_note),
                tooltip: 'الأحداث والمواسم',
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const EventsScreen()),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.assignment_outlined),
                tooltip: 'المهام',
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const TasksScreen()),
                ),
              ),
            ],
          ),

          // Main Body Content
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Quick Action Buttons Row (Liquid Glass Styled)
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            elevation: 3,
                          ),
                          icon: const Icon(Icons.flash_on, size: 18),
                          label: Text(
                            isArabic ? 'تسجيل الحضور السريع ⚡' : 'Quick Attendance ⚡',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          onPressed: () => showDialog(
                            context: context,
                            builder: (_) => const QuickAttendanceDialog(),
                          ),
                        ),
                        const SizedBox(width: 10),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: glassCardColor,
                            foregroundColor: primaryTextColor,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            side: BorderSide(color: glassBorderColor),
                            elevation: 1,
                          ),
                          icon: const Icon(Icons.person_add_alt_1, size: 18),
                          label: Text(isArabic ? 'إضافة شخص جديد +' : 'Add Person +'),
                          onPressed: () => _showAddPersonDialog(context, service),
                        ),
                        const SizedBox(width: 10),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: glassCardColor,
                            foregroundColor: primaryTextColor,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            side: BorderSide(color: glassBorderColor),
                            elevation: 1,
                          ),
                          icon: const Icon(Icons.event_outlined, size: 18),
                          label: Text(isArabic ? 'الأحداث والـ Overload ⚡' : 'Events & Overload ⚡'),
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const EventsScreen()),
                          ),
                        ),
                        const SizedBox(width: 10),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: glassCardColor,
                            foregroundColor: primaryTextColor,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            side: BorderSide(color: glassBorderColor),
                            elevation: 1,
                          ),
                          icon: const Icon(Icons.file_download_outlined, size: 18),
                          label: Text(isArabic ? 'تصدير التقارير 🖨️' : 'Export Reports 🖨️'),
                          onPressed: () => showDialog(
                            context: context,
                            builder: (_) => const ExportDialog(),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Top Executive KPI Metric Grid
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final isDesktop = constraints.maxWidth > 900;
                      final isTablet = constraints.maxWidth > 600;
                      final count = isDesktop ? 5 : (isTablet ? 3 : 2);

                      return GridView.count(
                        crossAxisCount: count,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        crossAxisSpacing: 10,
                        mainAxisSpacing: 10,
                        childAspectRatio: isDesktop ? 1.7 : 1.4,
                        children: [
                          ExecutiveKpiCard(
                            title: isArabic ? 'إجمالي الخدام والأشخاص' : 'Total People',
                            value: '${service.totalPeople}',
                            icon: Icons.people_alt_outlined,
                            color: primaryTextColor,
                          ),
                          ExecutiveKpiCard(
                            title: isArabic ? 'متوسط الالتزام الصافي' : 'Average Commitment',
                            value: '${service.averageCommitment.toStringAsFixed(0)}%',
                            icon: Icons.verified_user_outlined,
                            color: Colors.green.shade700,
                            backgroundColor: Colors.green.shade50.withOpacity(isDark ? 0.2 : 0.5),
                          ),
                          ExecutiveKpiCard(
                            title: isArabic ? 'حالات تحتاج افتقاد عاجل' : 'Urgent Follow-up',
                            value: '${service.urgentFollowupCount}',
                            icon: Icons.priority_high_outlined,
                            color: Colors.red.shade700,
                            backgroundColor: Colors.red.shade50.withOpacity(isDark ? 0.2 : 0.5),
                          ),
                          ExecutiveKpiCard(
                            title: isArabic ? 'غيابات بدون عذر' : 'Unexcused Absences',
                            value: '${service.totalUnexcusedSum}',
                            icon: Icons.cancel_outlined,
                            color: Colors.red.shade600,
                          ),
                          ExecutiveKpiCard(
                            title: isArabic ? 'إجمالي Overload الأحداث' : 'Total Overload',
                            value: '+${service.totalOverloadSum} ⚡',
                            icon: Icons.bolt,
                            color: Colors.purple.shade700,
                          ),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 24),

                  // Executive Assistant Questions Solver View
                  AdminQuestionSolverView(
                    onOpenAnalytics: (p) => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => PersonAnalyticsScreen(person: p)),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Quick Search Bar in person-card-container (Liquid Glass Card)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: glassCardColor,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: glassBorderColor, width: 1.2),
                      boxShadow: [
                        BoxShadow(
                          color: isDark ? Colors.black38 : Colors.amber.shade900.withOpacity(0.04),
                          blurRadius: 18,
                          offset: const Offset(0, 6),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppColors.accent.withOpacity(0.18),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.search, color: AppColors.primary, size: 20),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    isArabic ? 'البحث السريع في بطاقات الأشخاص' : 'Quick Search in Person Cards',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                      color: primaryTextColor,
                                    ),
                                  ),
                                  Text(
                                    isArabic
                                        ? 'تصفية فورية لكشف الخدام والمخدومين بالاسم'
                                        : 'Filter people roster instantly by name',
                                    style: TextStyle(fontSize: 11, color: isDark ? Colors.white60 : Colors.black54),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.accent.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: glassBorderColor),
                              ),
                              child: Text(
                                '${filteredPeopleList.length} / ${service.people.length}',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _searchController,
                          onChanged: (val) => service.setPersonCardsSearchQuery(val),
                          style: TextStyle(color: primaryTextColor, fontSize: 14),
                          decoration: InputDecoration(
                            hintText: isArabic
                                ? 'ابحث باسم الخادم أو المخدوم للتصفية الفورية...'
                                : 'Search person name to filter...',
                            hintStyle: TextStyle(
                              fontSize: 13,
                              color: isDark ? Colors.white38 : Colors.grey.shade500,
                            ),
                            prefixIcon: const Icon(Icons.filter_alt_outlined, color: AppColors.accent, size: 20),
                            suffixIcon: service.personCardsSearchQuery.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(Icons.clear, size: 18),
                                    onPressed: () {
                                      _searchController.clear();
                                      service.clearPersonCardsSearchQuery();
                                    },
                                  )
                                : null,
                            filled: true,
                            fillColor: isDark ? Colors.black26 : const Color(0xFFFBF8F2),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: BorderSide(color: glassBorderColor),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: BorderSide(color: glassBorderColor),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Header of People Roster
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isArabic ? '👥 كشف الخدام والمخدومين' : '👥 People Roster',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: primaryTextColor),
                      ),
                      Text(
                        isArabic
                            ? '${filteredPeopleList.length} شخص معروض'
                            : '${filteredPeopleList.length} people shown',
                        style: TextStyle(fontSize: 12, color: isDark ? Colors.white60 : Colors.grey.shade600),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // If search returned empty
                  if (filteredPeopleList.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(32),
                      decoration: BoxDecoration(
                        color: glassCardColor,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: glassBorderColor),
                      ),
                      child: Column(
                        children: [
                          const Icon(Icons.search_off, size: 48, color: AppColors.accent),
                          const SizedBox(height: 8),
                          Text(
                            isArabic ? 'لا توجد نتائج مطابقة للبحث' : 'No matching results found',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: primaryTextColor),
                          ),
                          const SizedBox(height: 8),
                          TextButton(
                            onPressed: () {
                              _searchController.clear();
                              service.clearPersonCardsSearchQuery();
                            },
                            child: Text(isArabic ? 'عرض جميع الأشخاص' : 'Clear Search Filter'),
                          ),
                        ],
                      ),
                    )
                  else
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final isDesktop = constraints.maxWidth > 950;
                        final isTablet = constraints.maxWidth > 650;
                        final crossCount = isDesktop ? 3 : (isTablet ? 2 : 1);

                        return GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: crossCount,
                            crossAxisSpacing: 14,
                            mainAxisSpacing: 14,
                            childAspectRatio: isDesktop ? 1.05 : (isTablet ? 1.0 : 1.2),
                          ),
                          itemCount: filteredPeopleList.length,
                          itemBuilder: (context, index) {
                            final person = filteredPeopleList[index];
                            return PersonCard(
                              person: person,
                              onAnalyticsTap: () => Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => PersonAnalyticsScreen(person: person),
                                ),
                              ),
                            );
                          },
                        );
                      },
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showAddPersonDialog(BuildContext context, AttendanceService service) {
    final ctrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('إضافة شخص جديد'),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(labelText: 'الاسم ثلاثي أو ثنائي'),
          autofocus: true,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () {
              if (ctrl.text.trim().isNotEmpty) {
                service.addPerson(ctrl.text.trim());
                Navigator.pop(ctx);
              }
            },
            child: const Text('إضافة', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
