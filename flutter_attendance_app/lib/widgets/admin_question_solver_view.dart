import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../models/person.dart';
import '../services/attendance_service.dart';

class AdminQuestionSolverView extends StatelessWidget {
  final Function(Person) onOpenAnalytics;

  const AdminQuestionSolverView({
    super.key,
    required this.onOpenAnalytics,
  });

  @override
  Widget build(BuildContext context) {
    final service = Provider.of<AttendanceService>(context);
    final filteredPeople = service.getFilteredQuestionPeople();

    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.95),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.amber.shade300, width: 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.amber.shade900.withOpacity(0.08),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header with Copy Brief Button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.psychology_outlined, color: Colors.amber, size: 22),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'مركز إجابات أسئلة المسؤول والمتابعة',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF493521)),
                      ),
                      Text(
                        'إجابات جاهزة بنقرة واحدة حول الغيابات، الافتقاد، والاعتذارات',
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ],
              ),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF25D366),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 2,
                ),
                icon: const Icon(Icons.copy, size: 16),
                label: const Text('نسخ تقرير المسؤول', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                onPressed: () {
                  final text = service.generateAdminBrief();
                  Clipboard.setData(ClipboardData(text: text));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('تم نسخ تقرير المسؤول التنفيذي بنجاح! جاهز للصق على واتساب 📋'),
                      backgroundColor: Colors.green,
                    ),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Question Tabs
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildTab(
                  context: context,
                  title: '🚨 غياب بدون عذر',
                  count: service.people.where((p) => p.unexcusedCount > 0).length,
                  tab: AdminQuestionTab.unexcused,
                  color: Colors.red,
                  isSelected: service.currentTab == AdminQuestionTab.unexcused,
                ),
                const SizedBox(width: 8),
                _buildTab(
                  context: context,
                  title: '📞 افتقاد عاجل',
                  count: service.urgentFollowupCount,
                  tab: AdminQuestionTab.followup,
                  color: Colors.red.shade700,
                  isSelected: service.currentTab == AdminQuestionTab.followup,
                ),
                const SizedBox(width: 8),
                _buildTab(
                  context: context,
                  title: '🟡 أصحاب الاعتذارات',
                  count: service.people.where((p) => p.excusedCount > 0).length,
                  tab: AdminQuestionTab.excused,
                  color: Colors.amber.shade700,
                  isSelected: service.currentTab == AdminQuestionTab.excused,
                ),
                const SizedBox(width: 8),
                _buildTab(
                  context: context,
                  title: '👑 لوحة الشرف (100%)',
                  count: service.people.where((p) => p.commitmentRate == 100.0 && p.totalSessions > 0 && p.unexcusedCount == 0).length,
                  tab: AdminQuestionTab.honors,
                  color: Colors.green.shade700,
                  isSelected: service.currentTab == AdminQuestionTab.honors,
                ),
                const SizedBox(width: 8),
                _buildTab(
                  context: context,
                  title: '⚡ أبطال الـ Overload',
                  count: service.people.where((p) => p.getTotalOverload(service.events) > 0).length,
                  tab: AdminQuestionTab.overload,
                  color: Colors.purple.shade700,
                  isSelected: service.currentTab == AdminQuestionTab.overload,
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Search Field
          TextField(
            onChanged: service.setSearchQuery,
            decoration: InputDecoration(
              hintText: 'بحث بالاسم داخل قائمة الإجابات...',
              hintStyle: const TextStyle(fontSize: 12),
              prefixIcon: const Icon(Icons.search, size: 20),
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: Colors.grey.shade300),
              ),
              filled: true,
              fillColor: Colors.grey.shade50,
            ),
          ),
          const SizedBox(height: 12),

          // Results List
          if (filteredPeople.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 24),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Center(
                child: Text(
                  'لا توجد حالات مطابقة لهذا التساؤل حالياً 🎉',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.grey.shade600),
                ),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: filteredPeople.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final p = filteredPeople[index];
                return _buildPersonResultRow(context, p, index + 1, service);
              },
            ),
        ],
      ),
    );
  }

  Widget _buildTab({
    required BuildContext context,
    required String title,
    required int count,
    required AdminQuestionTab tab,
    required Color color,
    required bool isSelected,
  }) {
    return InkWell(
      onTap: () => Provider.of<AttendanceService>(context, listen: false).setAdminTab(tab),
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.15) : Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? color : Colors.transparent, width: 1.5),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                color: isSelected ? color : Colors.grey.shade700,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: isSelected ? color : Colors.grey.shade400,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '$count',
                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPersonResultRow(BuildContext context, Person p, int index, AttendanceService service) {
    String specificBadge = '';
    Color badgeColor = Colors.grey;

    if (service.currentTab == AdminQuestionTab.unexcused) {
      specificBadge = '🔴 ${p.unexcusedCount} بدون عذر';
      badgeColor = Colors.red;
    } else if (service.currentTab == AdminQuestionTab.followup) {
      specificBadge = '⚠️ انقطاع آخر ${p.consecutiveAbsences} جلسات';
      badgeColor = Colors.red.shade700;
    } else if (service.currentTab == AdminQuestionTab.excused) {
      final reasons = p.attendance.where((s) => s.isExcused && s.excuseReason.isNotEmpty).map((s) => s.excuseReason).toSet().join('، ');
      specificBadge = '🟡 ${p.excusedCount} اعتذار ${reasons.isNotEmpty ? "($reasons)" : ""}';
      badgeColor = Colors.amber.shade800;
    } else if (service.currentTab == AdminQuestionTab.honors) {
      specificBadge = '👑 التزام 100% (${p.attendedCount} حضور)';
      badgeColor = Colors.green.shade700;
    } else if (service.currentTab == AdminQuestionTab.overload) {
      final ov = p.getTotalOverload(service.events);
      specificBadge = '⚡ Overload: +$ov نزول';
      badgeColor = Colors.purple.shade700;
    }

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: const Color(0xFFD4B16D),
            child: Text(
              p.name.isNotEmpty ? p.name[0] : '؟',
              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(p.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                const SizedBox(height: 2),
                Text(
                  'الالتزام بالعذر: ${p.commitmentRate.toStringAsFixed(0)}% • حضور: ${p.attendedCount} • عذر: ${p.excusedCount}',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: badgeColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: badgeColor.withOpacity(0.3)),
            ),
            child: Text(
              specificBadge,
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: badgeColor),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.chat_outlined, size: 18, color: Colors.teal),
            tooltip: 'نسخ رسالة متابعة للواتساب',
            onPressed: () {
              final msg = service.generatePersonMessage(p);
              Clipboard.setData(ClipboardData(text: msg));
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('تم نسخ رسالة افتقاد لـ ${p.name} جاهزة للإرسال على واتساب 💬'),
                  backgroundColor: Colors.teal,
                ),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.bar_chart, size: 20, color: Colors.amber),
            tooltip: 'عرض الرسوم البيانية',
            onPressed: () => onOpenAnalytics(p),
          ),
        ],
      ),
    );
  }
}
