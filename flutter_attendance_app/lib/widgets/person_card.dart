import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/person.dart';
import '../services/attendance_service.dart';

class PersonCard extends StatelessWidget {
  final Person person;
  final VoidCallback onAnalyticsTap;

  const PersonCard({
    super.key,
    required this.person,
    required this.onAnalyticsTap,
  });

  @override
  Widget build(BuildContext context) {
    final service = Provider.of<AttendanceService>(context, listen: false);
    final overload = person.getTotalOverload(service.events);
    final commitment = person.commitmentRate;

    Color boxColor = const Color(0xFFFAF5EE);
    Color borderColor = Colors.amber.shade200;
    if (commitment == 100.0 && person.totalSessions > 0) {
      boxColor = Colors.green.shade50;
      borderColor = Colors.green.shade300;
    } else if (person.unexcusedCount >= 3 || (person.totalSessions > 0 && commitment < 50)) {
      boxColor = Colors.red.shade50;
      borderColor = Colors.red.shade300;
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.amber.shade200.withOpacity(0.6)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Top Buttons (Analytics + Delete)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                icon: const Icon(Icons.bar_chart, color: Colors.amber, size: 22),
                tooltip: 'رسوم بيانية وإحصائيات مفصلة',
                onPressed: onAnalyticsTap,
              ),
              IconButton(
                icon: Icon(Icons.delete_outline, color: Colors.red.shade400, size: 20),
                tooltip: 'حذف الشخص',
                onPressed: () {
                  showDialog(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: const Text('تأكيد الحذف'),
                      content: Text('هل أنت متأكد من حذف ${person.name}؟'),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                          onPressed: () {
                            service.deletePerson(person.id);
                            Navigator.pop(ctx);
                          },
                          child: const Text('حذف', style: TextStyle(color: Colors.white)),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ],
          ),

          // Avatar
          CircleAvatar(
            radius: 26,
            backgroundColor: const Color(0xFFD4B16D),
            child: Text(
              person.name.isNotEmpty ? person.name[0] : '؟',
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
            ),
          ),
          const SizedBox(height: 8),

          // Name
          Text(
            person.name,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF493521)),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 6),

          // Overload Badge
          if (overload > 0)
            Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
              decoration: BoxDecoration(
                color: Colors.purple.shade600,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '⚡ Overload: +$overload نزول',
                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ),

          // Urgent Followup Badge
          if (person.needsFollowUp)
            Container(
              margin: const EdgeInsets.only(bottom: 6),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: Colors.red.shade100,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.red.shade300),
              ),
              child: Text(
                '⚠️ يحتاج افتقاد (غائب آخر ${person.consecutiveAbsences} جلسات)',
                style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Colors.red.shade900),
                textAlign: TextAlign.center,
              ),
            ),

          const SizedBox(height: 4),

          // Commitment Rate Box
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: boxColor,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: borderColor),
            ),
            child: Column(
              children: [
                Text(
                  '${commitment.toStringAsFixed(0)}%',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: commitment >= 75 ? Colors.green.shade800 : Colors.red.shade800,
                  ),
                ),
                Text(
                  'نسبة الالتزام بالعذر',
                  style: TextStyle(fontSize: 10, color: Colors.grey.shade700, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _statusPill('🟢 ${person.attendedCount}', 'حاضر', Colors.green.shade100, Colors.green.shade900),
                    _statusPill('🟡 ${person.excusedCount}', 'معتذر', Colors.amber.shade100, Colors.amber.shade900),
                    _statusPill('🔴 ${person.unexcusedCount}', 'بدون عذر', Colors.red.shade100, Colors.red.shade900),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _statusPill(String text, String tooltip, Color bg, Color textColor) {
    return Tooltip(
      message: tooltip,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          text,
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: textColor),
        ),
      ),
    );
  }
}
