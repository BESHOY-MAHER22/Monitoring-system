import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/church_event.dart';
import '../models/person.dart';
import '../services/attendance_service.dart';

class PersonAnalyticsScreen extends StatefulWidget {
  final Person person;

  const PersonAnalyticsScreen({super.key, required this.person});

  @override
  State<PersonAnalyticsScreen> createState() => _PersonAnalyticsScreenState();
}

class _PersonAnalyticsScreenState extends State<PersonAnalyticsScreen> {
  ChurchEvent? _selectedEvent;

  @override
  void initState() {
    super.initState();
    final service = Provider.of<AttendanceService>(context, listen: false);
    if (service.events.isNotEmpty) {
      _selectedEvent = service.events.first;
    }
  }

  @override
  Widget build(BuildContext context) {
    final service = Provider.of<AttendanceService>(context);
    final p = widget.person;
    final overload = p.getTotalOverload(service.events);

    return Scaffold(
      appBar: AppBar(
        title: Text('تحليلات ورسوم بيانية لـ: ${p.name}'),
        backgroundColor: const Color(0xFF936B36),
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // KPI Summary Row
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _buildMetricCard(
                  title: 'نسبة الالتزام بالعذر',
                  value: '${p.commitmentRate.toStringAsFixed(0)}%',
                  color: Colors.green.shade700,
                  icon: Icons.verified_user,
                ),
                _buildMetricCard(
                  title: 'الحضور المباشر',
                  value: '${p.attendanceRate.toStringAsFixed(0)}%',
                  color: Colors.blue.shade700,
                  icon: Icons.check_circle_outline,
                ),
                _buildMetricCard(
                  title: 'حاضر 🟢',
                  value: '${p.attendedCount}',
                  color: Colors.green.shade600,
                  icon: Icons.person,
                ),
                _buildMetricCard(
                  title: 'معتذر 🟡',
                  value: '${p.excusedCount}',
                  color: Colors.amber.shade700,
                  icon: Icons.access_time,
                ),
                _buildMetricCard(
                  title: 'بدون عذر 🔴',
                  value: '${p.unexcusedCount}',
                  color: Colors.red.shade700,
                  icon: Icons.cancel_outlined,
                ),
                _buildMetricCard(
                  title: 'Overload ⚡ الإضافي',
                  value: '+$overload نزول',
                  color: Colors.purple.shade700,
                  icon: Icons.bolt,
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Charts Grid
            LayoutBuilder(
              builder: (context, constraints) {
                final isWide = constraints.maxWidth > 700;
                return Column(
                  children: [
                    if (isWide)
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(child: _buildDoughnutChartCard(p)),
                          const SizedBox(width: 16),
                          Expanded(child: _buildEventsBarChartCard(p, service.events)),
                        ],
                      )
                    else ...[
                      _buildDoughnutChartCard(p),
                      const SizedBox(height: 16),
                      _buildEventsBarChartCard(p, service.events),
                    ],
                    const SizedBox(height: 16),
                    _buildSpecificEventDeepDiveCard(p, service.events),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required Color color,
    required IconData icon,
  }) {
    return Container(
      width: 160,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 4),
          Text(title, style: TextStyle(fontSize: 11, color: Colors.grey.shade700)),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }

  // Chart 1: 3-Slice Doughnut Chart (حاضر، معتذر، بدون عذر)
  Widget _buildDoughnutChartCard(Person p) {
    final total = p.totalSessions;
    final attended = p.attendedCount.toDouble();
    final excused = p.excusedCount.toDouble();
    final unexcused = p.unexcusedCount.toDouble();

    return Container(
      height: 320,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '1. المخطط الدائري لتوزيع الحضور والغياب والاعتذارات',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: total == 0
                ? const Center(child: Text('لا توجد جلسات مسجلة بعد لهذا الشخص'))
                : PieChart(
                    PieChartData(
                      sectionsSpace: 3,
                      centerSpaceRadius: 40,
                      sections: [
                        if (attended > 0)
                          PieChartSectionData(
                            color: Colors.green,
                            value: attended,
                            title: 'حاضر\n${attended.toInt()}',
                            radius: 55,
                            titleStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                        if (excused > 0)
                          PieChartSectionData(
                            color: Colors.amber.shade700,
                            value: excused,
                            title: 'معتذر\n${excused.toInt()}',
                            radius: 55,
                            titleStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                        if (unexcused > 0)
                          PieChartSectionData(
                            color: Colors.red,
                            value: unexcused,
                            title: 'بدون عذر\n${unexcused.toInt()}',
                            radius: 55,
                            titleStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                      ],
                    ),
                  ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _legendItem(Colors.green, 'حاضر 🟢'),
              const SizedBox(width: 12),
              _legendItem(Colors.amber.shade700, 'غياب باعتذار 🟡'),
              const SizedBox(width: 12),
              _legendItem(Colors.red, 'غياب بدون عذر 🔴'),
            ],
          ),
        ],
      ),
    );
  }

  // Chart 2: Stacked Bar Chart for Events & Overload
  Widget _buildEventsBarChartCard(Person p, List<ChurchEvent> events) {
    return Container(
      height: 320,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '2. رسم بياني لأحداث ومواسم الكنيسة وتتبع الـ Overload ⚡',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: events.isEmpty
                ? const Center(child: Text('لا توجد أحداث مسجلة'))
                : BarChart(
                    BarChartData(
                      alignment: BarChartAlignment.spaceAround,
                      maxY: 6,
                      barGroups: events.asMap().entries.map((entry) {
                        final idx = entry.key;
                        final ev = entry.value;
                        final count = p.getEventAttendanceCount(ev);
                        final regular = count > ev.targetCount ? ev.targetCount : count;
                        final overload = count > ev.targetCount ? (count - ev.targetCount) : 0;

                        return BarChartGroupData(
                          x: idx,
                          barRods: [
                            BarChartRodData(
                              toY: count.toDouble(),
                              rodStackItems: [
                                BarChartRodStackItem(0, regular.toDouble(), Colors.blue),
                                BarChartRodStackItem(regular.toDouble(), count.toDouble(), Colors.amber.shade700),
                              ],
                              borderRadius: BorderRadius.circular(6),
                              width: 24,
                            ),
                          ],
                        );
                      }).toList(),
                      titlesData: FlTitlesData(
                        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        leftTitles: const AxisTitles(
                          sideTitles: SideTitles(showTitles: true, reservedSize: 28),
                        ),
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            getTitlesWidget: (val, meta) {
                              final idx = val.toInt();
                              if (idx >= 0 && idx < events.length) {
                                return Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Text(
                                    events[idx].name.split(' ').take(2).join(' '),
                                    style: const TextStyle(fontSize: 10),
                                  ),
                                );
                              }
                              return const SizedBox();
                            },
                          ),
                        ),
                      ),
                    ),
                  ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _legendItem(Colors.blue, 'نزول عادي (حتى 2)'),
              const SizedBox(width: 16),
              _legendItem(Colors.amber.shade700, 'نزول إضافي ⚡ Overload'),
            ],
          ),
        ],
      ),
    );
  }

  // Deep Dive Card for a selected event
  Widget _buildSpecificEventDeepDiveCard(Person p, List<ChurchEvent> events) {
    if (events.isEmpty) return const SizedBox();

    final ev = _selectedEvent ?? events.first;
    final count = p.getEventAttendanceCount(ev);
    final target = ev.targetCount;
    final overload = p.getEventOverload(ev);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.amber.shade50.withOpacity(0.5),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.amber.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                '3. فحص التزام الشخص في حدث / موسم معين:',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF493521)),
              ),
              DropdownButton<ChurchEvent>(
                value: ev,
                items: events.map((e) => DropdownMenuItem(value: e, child: Text(e.name))).toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedEvent = val);
                },
              ),
            ],
          ),
          const SizedBox(height: 12),
          LinearProgressIndicator(
            value: (count / (target > 0 ? target : 2)).clamp(0.0, 1.0),
            backgroundColor: Colors.grey.shade200,
            color: count >= target ? Colors.green : Colors.blue,
            minHeight: 10,
            borderRadius: BorderRadius.circular(8),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('المطلوب: $target مرات | الحضور الفعلي: $count مرات'),
              if (overload > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: Colors.purple.shade700,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '⚡ Overload: +$overload نزول إضافي فوق المطلوب!',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                )
              else if (count >= target)
                const Text('أكمل الهدف المقرر بنجاح 🎉', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold))
              else
                Text('متبقي له ${target - count} نزول لإكمال المطلوب', style: const TextStyle(color: Colors.orange)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _legendItem(Color color, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 4),
        Text(text, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
      ],
    );
  }
}
