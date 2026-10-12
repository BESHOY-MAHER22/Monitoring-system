import 'attendance_record.dart';
import 'church_event.dart';

class Person {
  final String id;
  final String name;
  final List<AttendanceRecord> attendance;

  Person({
    required this.id,
    required this.name,
    required this.attendance,
  });

  int get attendedCount => attendance.where((s) => s.isPresent).length;
  int get excusedCount => attendance.where((s) => s.isExcused).length;
  int get unexcusedCount => attendance.where((s) => s.isUnexcused).length;
  int get totalSessions => attendance.length;

  /// Required sessions excluding justified excuses
  int get requiredSessions => (totalSessions - excusedCount) > 0 ? (totalSessions - excusedCount) : 0;

  /// Pure commitment percentage: e.g. 6 sessions, 4 attended, 2 excused => 4 / 4 = 100%!
  double get commitmentRate {
    if (requiredSessions > 0) {
      final rate = (attendedCount / requiredSessions) * 100;
      return rate > 100 ? 100 : rate;
    } else if (totalSessions > 0 && (attendedCount > 0 || excusedCount == totalSessions)) {
      return 100.0;
    }
    return 0.0;
  }

  /// Direct attendance percentage: attended / total
  double get attendanceRate {
    if (totalSessions == 0) return 0.0;
    return (attendedCount / totalSessions) * 100;
  }

  /// Calculates consecutive absences from most recent session to oldest
  int get consecutiveAbsences {
    final sorted = List<AttendanceRecord>.from(attendance)
      ..sort((a, b) => b.date.compareTo(a.date));
    int count = 0;
    for (final s in sorted) {
      if (!s.isPresent) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  /// Pastoral care alert needed if absent 2+ consecutive sessions or 2+ unexcused
  bool get needsFollowUp => consecutiveAbsences >= 2 || unexcusedCount >= 2;

  /// Calculate event attendance count
  int getEventAttendanceCount(ChurchEvent event) {
    return attendance.where((s) {
      if (!s.isPresent) return false;
      if (s.eventId == event.id) return true;
      if (s.dayName.contains(event.name)) return true;
      return false;
    }).length;
  }

  /// Overload for a specific event
  int getEventOverload(ChurchEvent event) {
    final count = getEventAttendanceCount(event);
    return count > event.targetCount ? (count - event.targetCount) : 0;
  }

  /// Total Overload across all church events
  int getTotalOverload(List<ChurchEvent> events) {
    int total = 0;
    for (final ev in events) {
      total += getEventOverload(ev);
    }
    return total;
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'attendance': attendance.map((a) => a.toJson()).toList(),
  };

  factory Person.fromJson(Map<String, dynamic> json) {
    final List<dynamic> attList = json['attendance'] ?? [];
    return Person(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      attendance: attList.map((item) => AttendanceRecord.fromJson(item)).toList(),
    );
  }
}
