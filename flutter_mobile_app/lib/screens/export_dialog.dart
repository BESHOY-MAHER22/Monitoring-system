import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../services/attendance_service.dart';
import '../services/export_service.dart';

class ExportDialog extends StatefulWidget {
  const ExportDialog({super.key});

  @override
  State<ExportDialog> createState() => _ExportDialogState();
}

class _ExportDialogState extends State<ExportDialog> {
  bool _isSummary = true;

  @override
  Widget build(BuildContext context) {
    final service = Provider.of<AttendanceService>(context);

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Container(
        width: 520,
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(Icons.print_outlined, color: Color(0xFF936B36), size: 28),
                const SizedBox(width: 8),
                const Text(
                  'مركز تصدير التقارير الرسمية',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'اختر نوع التقرير المناسب للمسؤولين بصيغة CSV (Excel) أو PDF للطباعة:',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 20),

            // Version Selector Cards
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _isSummary = true),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _isSummary ? Colors.amber.shade50 : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: _isSummary ? Colors.amber.shade700 : Colors.grey.shade300, width: 2),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.summarize_outlined, color: _isSummary ? Colors.amber.shade800 : Colors.grey),
                              const SizedBox(width: 6),
                              const Text('نسخة ملخصة', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'مناسبة للمسؤولين وأمين الخدمة: تعرض إجمالي الالتزام والحضور والـ Overload باختصار.',
                            style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _isSummary = false),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: !_isSummary ? Colors.amber.shade50 : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: !_isSummary ? Colors.amber.shade700 : Colors.grey.shade300, width: 2),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.receipt_long_outlined, color: !_isSummary ? Colors.amber.shade800 : Colors.grey),
                              const SizedBox(width: 6),
                              const Text('نسخة تفصيلية', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'سجل زمني شامل لكل شخص: تواريخ الأيام، حالات الغياب والاعتذارات وأسبابها وتفاصيل Overload.',
                            style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red.shade700,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(Icons.picture_as_pdf),
                    label: const Text('طباعة وتصدير PDF'),
                    onPressed: () async {
                      Navigator.pop(context);
                      await ExportService.exportPDF(
                        people: service.people,
                        events: service.events,
                        isSummary: _isSummary,
                      );
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green.shade700,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(Icons.table_chart),
                    label: const Text('نسخ / تصدير CSV'),
                    onPressed: () {
                      final csv = ExportService.generateCSV(
                        people: service.people,
                        events: service.events,
                        isSummary: _isSummary,
                      );
                      Clipboard.setData(ClipboardData(text: csv));
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('تم توليد ونسخ كشف CSV إلى الحافظة بنجاح، يمكنك لصقه في ملف Excel 📊'),
                          backgroundColor: Colors.green,
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
