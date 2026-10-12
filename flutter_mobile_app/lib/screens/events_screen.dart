import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/church_event.dart';
import '../services/attendance_service.dart';

class EventsScreen extends StatelessWidget {
  const EventsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final service = Provider.of<AttendanceService>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('الأحداث والمواسم وتتبع الـ Overload ⚡'),
        backgroundColor: const Color(0xFF936B36),
        foregroundColor: Colors.white,
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF936B36),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('إضافة حدث / موسم', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        onPressed: () => _showAddEventDialog(context, service),
      ),
      body: service.events.isEmpty
          ? const Center(child: Text('لا توجد أحداث مسجلة بعد.'))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: service.events.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, index) {
                final ev = service.events[index];
                final attendees = service.people.where((p) => p.getEventAttendanceCount(ev) > 0).toList();
                final overloadCount = service.people.fold<int>(0, (sum, p) => sum + p.getEventOverload(ev));

                return Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: ExpansionTile(
                    shape: const RoundedRectangleBorder(side: BorderSide.none),
                    leading: CircleAvatar(
                      backgroundColor: Colors.amber.shade100,
                      child: const Text('🎪', style: TextStyle(fontSize: 18)),
                    ),
                    title: Text(ev.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    subtitle: Text(
                      'الحد المقرر: ${ev.targetCount} مرات | الحاضرون: ${attendees.length} شخص | إجمالي الـ Overload: +$overloadCount ⚡',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                    ),
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            if (ev.description.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Text('الوصف: ${ev.description}', style: const TextStyle(fontSize: 12)),
                              ),
                            const Text(
                              'كشف الخدام الحاضرين في هذا الحدث ومعدلات النزول:',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF493521)),
                            ),
                            const SizedBox(height: 8),
                            if (attendees.isEmpty)
                              const Padding(
                                padding: EdgeInsets.all(12),
                                child: Text('لم يسجل أي شخص حضوراً في هذا الحدث بعد.', textAlign: TextAlign.center),
                              )
                            else
                              ListView.separated(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: attendees.length,
                                separatorBuilder: (_, __) => const Divider(height: 1),
                                itemBuilder: (context, i) {
                                  final p = attendees[i];
                                  final count = p.getEventAttendanceCount(ev);
                                  final overload = p.getEventOverload(ev);

                                  return ListTile(
                                    contentPadding: EdgeInsets.zero,
                                    leading: CircleAvatar(
                                      radius: 14,
                                      backgroundColor: const Color(0xFFD4B16D),
                                      child: Text(p.name[0], style: const TextStyle(color: Colors.white, fontSize: 12)),
                                    ),
                                    title: Text(p.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                                    subtitle: Text(
                                      'حضر: $count مرات من أصل ${ev.targetCount} مطلوبة',
                                      style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                                    ),
                                    trailing: overload > 0
                                        ? Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: Colors.purple.shade700,
                                              borderRadius: BorderRadius.circular(12),
                                            ),
                                            child: Text(
                                              '⚡ Overload: +$overload نزول إضافي',
                                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                                            ),
                                          )
                                        : (count >= ev.targetCount
                                            ? const Text('أكمل المطلوب (100%) ✅', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 11))
                                            : Text('متبقي ${ev.targetCount - count} ⏳', style: const TextStyle(color: Colors.orange, fontSize: 11))),
                                  );
                                },
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }

  void _showAddEventDialog(BuildContext context, AttendanceService service) {
    final nameCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final targetCtrl = TextEditingController(text: '2');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('إضافة حدث / موسم جديد'),
        content: SizedBox(
          width: 400,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameCtrl,
                decoration: const InputDecoration(labelText: 'اسم الحدث / الموسم (مثال: صوم العذراء)'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: descCtrl,
                decoration: const InputDecoration(labelText: 'الوصف أو الملاحظات'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: targetCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'الحد المطلوب لكل شخص قبل الـ Overload (الافتراضي: 2)'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF936B36)),
            onPressed: () {
              if (nameCtrl.text.trim().isEmpty) return;
              service.addEvent(
                nameCtrl.text.trim(),
                descCtrl.text.trim(),
                DateTime.now().toString().split(' ')[0],
                '',
                int.tryParse(targetCtrl.text) ?? 2,
              );
              Navigator.pop(ctx);
            },
            child: const Text('حفظ الحدث', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
