import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/church_task.dart';
import '../services/attendance_service.dart';

class TasksScreen extends StatelessWidget {
  const TasksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final service = Provider.of<AttendanceService>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('إدارة المهام والتكليفات'),
        backgroundColor: const Color(0xFF936B36),
        foregroundColor: Colors.white,
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF936B36),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('إضافة مهمة', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        onPressed: () => _showAddTaskDialog(context, service),
      ),
      body: service.tasks.isEmpty
          ? const Center(child: Text('لا توجد مهام مسجلة بعد.'))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: service.tasks.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final task = service.tasks[index];
                final person = service.people.firstWhere(
                  (p) => p.id == task.personId,
                  orElse: () => service.people.first,
                );

                return Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: task.status == TaskStatus.completed
                          ? Colors.green.shade100
                          : Colors.amber.shade100,
                      child: Icon(
                        task.status == TaskStatus.completed ? Icons.check : Icons.assignment_outlined,
                        color: task.status == TaskStatus.completed ? Colors.green : Colors.amber.shade900,
                      ),
                    ),
                    title: Text(task.description, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    subtitle: Text('المعين له: ${person.name} • تاريخ الاستحقاق: ${task.date}'),
                    trailing: DropdownButton<TaskStatus>(
                      value: task.status,
                      underline: const SizedBox(),
                      items: const [
                        DropdownMenuItem(value: TaskStatus.pending, child: Text('قيد الانتظار ⏳', style: TextStyle(fontSize: 12))),
                        DropdownMenuItem(value: TaskStatus.inProgress, child: Text('قيد التنفيذ 🔄', style: TextStyle(fontSize: 12))),
                        DropdownMenuItem(value: TaskStatus.completed, child: Text('منجزة ✅', style: TextStyle(fontSize: 12, color: Colors.green))),
                        DropdownMenuItem(value: TaskStatus.notCompleted, child: Text('لم تنجز ❌', style: TextStyle(fontSize: 12, color: Colors.red))),
                      ],
                      onChanged: (val) {
                        if (val != null) {
                          service.updateTaskStatus(task.id, val);
                        }
                      },
                    ),
                  ),
                );
              },
            ),
    );
  }

  void _showAddTaskDialog(BuildContext context, AttendanceService service) {
    final descCtrl = TextEditingController();
    String? selectedPersonId = service.people.isNotEmpty ? service.people.first.id : null;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('إضافة مهمة جديدة'),
          content: SizedBox(
            width: 400,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: descCtrl,
                  decoration: const InputDecoration(labelText: 'وصف المهمة'),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: selectedPersonId,
                  decoration: const InputDecoration(labelText: 'تعيين لشخص'),
                  items: service.people.map((p) => DropdownMenuItem(value: p.id, child: Text(p.name))).toList(),
                  onChanged: (val) => setDialogState(() => selectedPersonId = val),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('إلغاء')),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF936B36)),
              onPressed: () {
                if (descCtrl.text.trim().isEmpty || selectedPersonId == null) return;
                service.addTask(
                  descCtrl.text.trim(),
                  DateTime.now().toString().split(' ')[0],
                  selectedPersonId!,
                );
                Navigator.pop(ctx);
              },
              child: const Text('إضافة المهمة', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }
}
