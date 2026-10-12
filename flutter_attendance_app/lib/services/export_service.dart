import 'dart:convert';
import 'package:csv/csv.dart';
import 'package:flutter/foundation.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../models/church_event.dart';
import '../models/person.dart';

class ExportService {
  /// Generate CSV Report with full arabic Excel compatibility (BOM)
  static String generateCSV({
    required List<Person> people,
    required List<ChurchEvent> events,
    required bool isSummary,
  }) {
    final List<List<dynamic>> rows = [];

    rows.add(['أسرة الأنبا أرسانيوس والقديس نيقولاوس لوسائل الإيضاح']);
    rows.add([isSummary ? 'تقرير المتابعة - نسخة ملخصة للمسؤولين' : 'تقرير المتابعة - نسخة تفصيلية شاملة']);
    rows.add(['تاريخ الاستخراج: ${DateTime.now().toString().split(" ")[0]}']);
    rows.add([]);

    // Table Header
    rows.add([
      'م',
      'الاسم',
      'أيام الحضور الفعلي',
      'الغياب باعتذار',
      'الغياب بدون عذر',
      'نسبة الالتزام بالعذر %',
      'نسبة الحضور المباشر %',
      'نزول الأحداث',
      'مرات الـ Overload ⚡',
      'التقييم',
    ]);

    for (int i = 0; i < people.length; i++) {
      final p = people[i];
      final overload = p.getTotalOverload(events);
      String tier = 'يحتاج متابعة ⚠️';
      if (p.commitmentRate == 100.0 && p.totalSessions > 0) {
        tier = p.excusedCount > 0 ? 'ممتاز 🌟 (التزام كامل بالاعتذار)' : 'مثالي 👑 (100% التزام)';
      } else if (p.commitmentRate >= 75) {
        tier = 'منتظم ✅';
      } else if (p.unexcusedCount >= 2) {
        tier = 'غياب غير مبرر 🚨';
      }

      rows.add([
        i + 1,
        p.name,
        p.attendedCount,
        p.excusedCount,
        p.unexcusedCount,
        '${p.commitmentRate.toStringAsFixed(0)}%',
        '${p.attendanceRate.toStringAsFixed(0)}%',
        p.attendance.where((s) => s.isPresent && s.eventId != null).length,
        overload > 0 ? '+$overload ⚡' : '-',
        tier,
      ]);
    }

    if (!isSummary) {
      rows.add([]);
      rows.add(['=== السجل الزمني والتفصيلي لكل شخص ===']);
      for (final p in people) {
        rows.add(['سجل: ${p.name}']);
        rows.add(['التاريخ', 'اسم اليوم / الاجتماع', 'الحالة', 'سبب الاعتذار']);
        for (final s in p.attendance) {
          String statusStr = 'غائب بدون عذر';
          if (s.isPresent) statusStr = 'حاضر';
          if (s.isExcused) statusStr = 'معتذر';
          rows.add([s.date, s.dayName, statusStr, s.excuseReason]);
        }
        rows.add([]);
      }
    }

    const converter = ListToCsvConverter();
    final csvContent = converter.convert(rows);
    // Prefix with UTF-8 BOM so Excel opens it with Arabic text correctly
    return '\uFEFF$csvContent';
  }

  /// Print or Save PDF Report
  static Future<void> exportPDF({
    required List<Person> people,
    required List<ChurchEvent> events,
    required bool isSummary,
  }) async {
    final pdf = pw.Document();
    final font = await PdfGoogleFonts.cairoBold();
    final fontRegular = await PdfGoogleFonts.cairoRegular();

    pdf.addPage(
      pw.MultiPage(
        theme: pw.ThemeData.withFont(base: fontRegular, bold: font),
        textDirection: pw.TextDirection.rtl,
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return [
            // Header
            pw.Header(
              level: 0,
              child: pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'أسرة الأنبا أرسانيوس والقديس نيقولاوس لوسائل الإيضاح',
                        style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold, color: PdfColors.brown900),
                      ),
                      pw.Text(
                        isSummary ? 'تقرير المتابعة والالتزام (نسخة ملخصة للمسؤولين)' : 'تقرير المتابعة الشامل والتفصيلي (Full Audit)',
                        style: const pw.TextStyle(fontSize: 12, color: PdfColors.amber800),
                      ),
                    ],
                  ),
                  pw.Text('التاريخ: ${DateTime.now().toString().split(" ")[0]}', style: const pw.TextStyle(fontSize: 10)),
                ],
              ),
            ),
            pw.SizedBox(height: 12),

            // Table of People
            pw.TableHelper.fromTextArray(
              context: context,
              cellAlignment: pw.Alignment.centerRight,
              headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10),
              cellStyle: const pw.TextStyle(fontSize: 9),
              headers: ['م', 'الاسم', 'حضور', 'بعذر', 'بدون عذر', 'الالتزام %', 'حضور %', 'Overload', 'التقييم'],
              data: List<List<dynamic>>.generate(people.length, (index) {
                final p = people[index];
                final ov = p.getTotalOverload(events);
                return [
                  '${index + 1}',
                  p.name,
                  '${p.attendedCount}',
                  '${p.excusedCount}',
                  '${p.unexcusedCount}',
                  '${p.commitmentRate.toStringAsFixed(0)}%',
                  '${p.attendanceRate.toStringAsFixed(0)}%',
                  ov > 0 ? '+$ov ⚡' : '-',
                  p.commitmentRate == 100 ? 'ملتزم 👑' : (p.unexcusedCount >= 2 ? 'إنذار 🚨' : 'متابع'),
                ];
              }),
            ),
          ];
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: isSummary ? 'تقرير_ملخص_المسؤولين.pdf' : 'تقرير_تفصيلي_شامل.pdf',
    );
  }
}
