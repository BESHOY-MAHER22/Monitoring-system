import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/attendance_record.dart';
import '../services/attendance_service.dart';

class QuickAttendanceDialog extends StatefulWidget {
  const QuickAttendanceDialog({super.key});

  @override
  State<QuickAttendanceDialog> createState() => _QuickAttendanceDialogState();
}

class _QuickAttendanceDialogState extends State<QuickAttendanceDialog> {
  DateTime _selectedDate = DateTime.now();
  final TextEditingController _dayNameController = TextEditingController(text: 'اجتماع الخدام');
  String? _selectedEventId;
  String _searchQuery = '';

  final Map<String, AttendanceStatus> _statusMap = {};
  final Map<String, String> _excuseReasonMap = {};

  final List<String> _excuseReasons = [
    'مرض ووعكة صحية',
    'امتحانات ومذاكرة',
    'سفر',
    'ظروف عمل',
    'ظرف أسري / طارئ',
    'أخرى',
  ];

  @override
  void initState() {
    super.initState();
    final service = Provider.of<AttendanceService>(context, listen: false);
    for (final p in service.people) {
      _statusMap[p.id] = AttendanceStatus.present; // Default all present
      _excuseReasonMap[p.id] = _excuseReasons.first;
    }
  }

  void _markAll(AttendanceStatus status) {
    setState(() {
      for (final key in _statusMap.keys) {
        _statusMap[key] = status;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final service = Provider.of<AttendanceService>(context);
    final filteredPeople = service.people.where((p) {
      if (_searchQuery.isEmpty) return true;
      return p.name.toLowerCase().contains(_searchQuery.toLowerCase());
    }).toList();

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Container(
        width: 720,
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.88,
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Title & Close Button
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Text('⚡', style: TextStyle(fontSize: 22)),
                    const SizedBox(width: 8),
                    const Text(
                      'تسجيل الحضور والغياب والاعتذارات السريع',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const Divider(),

            // Date & Meeting Name Row
            Row(
              children: [
                Expanded(
                  flex: 3,
                  child: TextField(
                    controller: _dayNameController,
                    decoration: const InputDecoration(
                      labelText: 'اسم اليوم / الاجتماع',
                      isDense: true,
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: InkWell(
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _selectedDate,
                        firstDate: DateTime(2020),
                        lastDate: DateTime(2030),
                      );
                      if (picked != null) {
                        setState(() => _selectedDate = picked);
                      }
                    },
                    child: InputDecorator(
                      decoration: const InputDecoration(
                        labelText: 'تاريخ الجلسة',
                        isDense: true,
                        border: OutlineInputBorder(),
                      ),
                      child: Text(DateFormat('yyyy/MM/dd').format(_selectedDate)),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Optional Event selection for Overload tagging
            if (service.events.isNotEmpty)
              DropdownButtonFormField<String>(
                value: _selectedEventId,
                decoration: const InputDecoration(
                  labelText: 'ربط بحدث / موسم لمتابعة الـ Overload (اختياري)',
                  isDense: true,
                  border: OutlineInputBorder(),
                ),
                items: [
                  const DropdownMenuItem(value: null, child: Text('لا يوجد (اجتماع عادي)')),
                  ...service.events.map((e) => DropdownMenuItem(
                    value: e.id,
                    child: Text('${e.name} (الحد: ${e.targetCount})'),
                  )),
                ],
                onChanged: (val) => setState(() => _selectedEventId = val),
              ),

            const SizedBox(height: 12),

            // Bulk actions & Search toolbar
            Row(
              children: [
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.green.shade600),
                  onPressed: () => _markAll(AttendanceStatus.present),
                  child: const Text('🟢 الكل حاضر', style: TextStyle(color: Colors.white, fontSize: 11)),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.red.shade600),
                  onPressed: () => _markAll(AttendanceStatus.unexcused),
                  child: const Text('🔴 الكل غائب', style: TextStyle(color: Colors.white, fontSize: 11)),
                ),
                const Spacer(),
                SizedBox(
                  width: 220,
                  child: TextField(
                    onChanged: (v) => setState(() => _searchQuery = v),
                    decoration: const InputDecoration(
                      hintText: 'بحث بالاسم لتسجيل عذر...',
                      prefixIcon: Icon(Icons.search, size: 18),
                      isDense: true,
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // People List with Status Options
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: ListView.separated(
                  itemCount: filteredPeople.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final p = filteredPeople[index];
                    final currentStatus = _statusMap[p.id] ?? AttendanceStatus.present;
                    final currentReason = _excuseReasonMap[p.id] ?? _excuseReasons.first;

                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 14,
                            backgroundColor: const Color(0xFFD4B16D),
                            child: Text(p.name[0], style: const TextStyle(fontSize: 12, color: Colors.white)),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(p.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          ),

                          // Status Toggles
                          SegmentedButton<AttendanceStatus>(
                            segments: const [
                              ButtonSegment(value: AttendanceStatus.present, label: Text('حاضر 🟢', style: TextStyle(fontSize: 11))),
                              ButtonSegment(value: AttendanceStatus.excused, label: Text('معتذر 🟡', style: TextStyle(fontSize: 11))),
                              ButtonSegment(value: AttendanceStatus.unexcused, label: Text('بدون عذر 🔴', style: TextStyle(fontSize: 11))),
                            ],
                            selected: {currentStatus},
                            onSelectionChanged: (Set<AttendanceStatus> newSelection) {
                              setState(() {
                                _statusMap[p.id] = newSelection.first;
                              });
                            },
                          ),

                          // Excuse Reason Dropdown if excused
                          if (currentStatus == AttendanceStatus.excused) ...[
                            const SizedBox(width: 8),
                            SizedBox(
                              width: 150,
                              child: DropdownButtonFormField<String>(
                                value: currentReason,
                                isDense: true,
                                decoration: const InputDecoration(
                                  contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  border: OutlineInputBorder(),
                                ),
                                items: _excuseReasons.map((r) => DropdownMenuItem(
                                  value: r,
                                  child: Text(r, style: const TextStyle(fontSize: 11)),
                                )).toList(),
                                onChanged: (v) {
                                  if (v != null) {
                                    setState(() => _excuseReasonMap[p.id] = v);
                                  }
                                },
                              ),
                            ),
                          ],
                        ],
                      ),
                    );
                  },
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Confirm & Cancel Buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('إلغاء'),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF936B36),
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate);
                    service.quickRecordAttendance(
                      date: dateStr,
                      dayName: _dayNameController.text.trim(),
                      statusMap: _statusMap,
                      excuseReasonMap: _excuseReasonMap,
                      eventId: _selectedEventId,
                    );
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('تم تسجيل واعتماد الحضور والغياب لتاريخ ($dateStr) بنجاح! 🎉'),
                        backgroundColor: Colors.green,
                      ),
                    );
                  },
                  child: const Text('حفظ واعتماد الجلسة', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
