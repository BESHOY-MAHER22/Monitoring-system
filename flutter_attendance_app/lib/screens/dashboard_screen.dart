import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/attendance_service.dart';
import '../widgets/admin_question_solver_view.dart';
import '../widgets/executive_kpi_card.dart';
import '../widgets/person_card.dart';
import 'events_screen.dart';
import 'export_dialog.dart';
import 'person_analytics_screen.dart';
import 'quick_attendance_dialog.dart';
import 'tasks_screen.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final service = Provider.of<AttendanceService>(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF7F1E7),
      appBar: AppBar(
        backgroundColor: const Color(0xFF936B36),
        foregroundColor: Colors.white,
        elevation: 2,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'أسرة الأنبا أرسانيوس والقديس نيقولاوس لوسائل الإيضاح',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            Text(
              'نظام متابعة الحضور والمهام والأحداث والـ Overload',
              style: TextStyle(fontSize: 11, color: Colors.white70),
            ),
          ],
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
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Quick Action Buttons Row
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF936B36),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    icon: const Icon(Icons.flash_on, size: 18),
                    label: const Text('تسجيل الحضور السريع ⚡', style: TextStyle(fontWeight: FontWeight.bold)),
                    onPressed: () => showDialog(
                      context: context,
                      builder: (_) => const QuickAttendanceDialog(),
                    ),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF493521),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      side: BorderSide(color: Colors.amber.shade400),
                    ),
                    icon: const Icon(Icons.person_add_alt_1, size: 18),
                    label: const Text('إضافة شخص جديد +'),
                    onPressed: () => _showAddPersonDialog(context, service),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF493521),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      side: BorderSide(color: Colors.amber.shade400),
                    ),
                    icon: const Icon(Icons.event_outlined, size: 18),
                    label: const Text('الأحداث والـ Overload ⚡'),
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const EventsScreen()),
                    ),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF493521),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      side: BorderSide(color: Colors.amber.shade400),
                    ),
                    icon: const Icon(Icons.file_download_outlined, size: 18),
                    label: const Text('تصدير التقارير 🖨️'),
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
                      title: 'إجمالي الخدام والأشخاص',
                      value: '${service.totalPeople}',
                      icon: Icons.people_alt_outlined,
                      color: const Color(0xFF493521),
                    ),
                    ExecutiveKpiCard(
                      title: 'متوسط الالتزام الصافي',
                      value: '${service.averageCommitment.toStringAsFixed(0)}%',
                      icon: Icons.verified_user_outlined,
                      color: Colors.green.shade700,
                      backgroundColor: Colors.green.shade50.withOpacity(0.5),
                    ),
                    ExecutiveKpiCard(
                      title: 'حالات تحتاج افتقاد عاجل',
                      value: '${service.urgentFollowupCount}',
                      icon: Icons.priority_high_outlined,
                      color: Colors.red.shade700,
                      backgroundColor: Colors.red.shade50.withOpacity(0.5),
                    ),
                    ExecutiveKpiCard(
                      title: 'غيابات بدون عذر',
                      value: '${service.totalUnexcusedSum}',
                      icon: Icons.cancel_outlined,
                      color: Colors.red.shade600,
                    ),
                    ExecutiveKpiCard(
                      title: 'إجمالي Overload الأحداث',
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

            // People Roster Grid
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  '👥 كشف الخدام والمخدومين',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF493521)),
                ),
                Text(
                  '${service.people.length} شخص مسجل',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                ),
              ],
            ),
            const SizedBox(height: 12),

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
                  itemCount: service.people.length,
                  itemBuilder: (context, index) {
                    final person = service.people[index];
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
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF936B36)),
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
