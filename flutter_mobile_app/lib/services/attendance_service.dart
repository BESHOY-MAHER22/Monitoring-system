import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/attendance_record.dart';
import '../models/church_event.dart';
import '../models/church_task.dart';
import '../models/person.dart';
import 'mock_data.dart';

enum AdminQuestionTab {
  unexcused, // الأكثر غياباً بدون عذر
  followup,  // الافتقاد العاجل (انقطاع متتالي)
  excused,   // أصحاب الاعتذارات المتكررة
  honors,    // لوحة الشرف (التزام 100%)
  overload,  // أبطال الأحداث والـ Overload
}

class AttendanceService extends ChangeNotifier {
  List<Person> _people = [];
  List<ChurchEvent> _events = [];
  List<ChurchTask> _tasks = [];
  AdminQuestionTab _currentTab = AdminQuestionTab.unexcused;
  String _searchQuery = '';
  String _personCardsSearchQuery = '';
  bool _isDarkMode = false;
  Locale _currentLocale = const Locale('ar', 'EG');

  AttendanceService() {
    loadInitialData();
  }

  void loadInitialData() {
    _events = MockData.getEvents();
    _tasks = MockData.getTasks();
    _people = MockData.getPeople();
    notifyListeners();
  }

  List<Person> get people => _people;
  List<ChurchEvent> get events => _events;
  List<ChurchTask> get tasks => _tasks;
  AdminQuestionTab get currentTab => _currentTab;
  String get searchQuery => _searchQuery;
  String get personCardsSearchQuery => _personCardsSearchQuery;
  bool get isDarkMode => _isDarkMode;
  Locale get currentLocale => _currentLocale;

  void toggleTheme() {
    _isDarkMode = !_isDarkMode;
    notifyListeners();
  }

  void toggleLocale() {
    if (_currentLocale.languageCode == 'ar') {
      _currentLocale = const Locale('en', 'US');
    } else {
      _currentLocale = const Locale('ar', 'EG');
    }
    notifyListeners();
  }

  void setPersonCardsSearchQuery(String query) {
    _personCardsSearchQuery = query.trim().toLowerCase();
    notifyListeners();
  }

  void clearPersonCardsSearchQuery() {
    _personCardsSearchQuery = '';
    notifyListeners();
  }

  List<Person> get filteredPeople {
    if (_personCardsSearchQuery.isEmpty) return _people;
    return _people.where((p) => p.name.toLowerCase().contains(_personCardsSearchQuery)).toList();
  }

  void setAdminTab(AdminQuestionTab tab) {
    _currentTab = tab;
    notifyListeners();
  }

  void setSearchQuery(String q) {
    _searchQuery = q.trim().toLowerCase();
    notifyListeners();
  }

  // --- Global KPIs ---
  int get totalPeople => _people.length;

  int get totalOverloadSum {
    int total = 0;
    for (final p in _people) {
      total += p.getTotalOverload(_events);
    }
    return total;
  }

  double get averageCommitment {
    if (_people.isEmpty) return 0.0;
    final total = _people.fold<double>(0.0, (acc, p) => acc + p.commitmentRate);
    return total / _people.length;
  }

  int get totalUnexcusedSum {
    return _people.fold<int>(0, (acc, p) => acc + p.unexcusedCount);
  }

  int get totalExcusedSum {
    return _people.fold<int>(0, (acc, p) => acc + p.excusedCount);
  }

  int get urgentFollowupCount {
    return _people.where((p) => p.needsFollowUp).length;
  }

  // --- Executive Solver Question Filtered Lists ---
  List<Person> getFilteredQuestionPeople() {
    List<Person> list = [];
    switch (_currentTab) {
      case AdminQuestionTab.unexcused:
        list = _people.where((p) => p.unexcusedCount > 0).toList()
          ..sort((a, b) => b.unexcusedCount.compareTo(a.unexcusedCount));
        break;
      case AdminQuestionTab.followup:
        list = _people.where((p) => p.needsFollowUp).toList()
          ..sort((a, b) => b.consecutiveAbsences.compareTo(a.consecutiveAbsences));
        break;
      case AdminQuestionTab.excused:
        list = _people.where((p) => p.excusedCount > 0).toList()
          ..sort((a, b) => b.excusedCount.compareTo(a.excusedCount));
        break;
      case AdminQuestionTab.honors:
        list = _people.where((p) => p.commitmentRate == 100.0 && p.totalSessions > 0 && p.unexcusedCount == 0).toList()
          ..sort((a, b) => b.attendedCount.compareTo(a.attendedCount));
        break;
      case AdminQuestionTab.overload:
        list = _people.where((p) => p.getTotalOverload(_events) > 0).toList()
          ..sort((a, b) => b.getTotalOverload(_events).compareTo(a.getTotalOverload(_events)));
        break;
    }

    if (_searchQuery.isNotEmpty) {
      list = list.where((p) => p.name.toLowerCase().contains(_searchQuery)).toList();
    }
    return list;
  }

  // --- CRUD & Operations ---
  void addPerson(String name) {
    if (name.trim().isEmpty) return;
    final newPerson = Person(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      name: name.trim(),
      attendance: [],
    );
    _people.add(newPerson);
    notifyListeners();
  }

  void deletePerson(String id) {
    _people.removeWhere((p) => p.id == id);
    _tasks.removeWhere((t) => t.personId == id);
    notifyListeners();
  }

  void addEvent(String name, String desc, String start, String end, int target) {
    _events.add(ChurchEvent(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      name: name,
      description: desc,
      startDate: start,
      endDate: end,
      targetCount: target,
    ));
    notifyListeners();
  }

  void addTask(String desc, String date, String personId) {
    _tasks.add(ChurchTask(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      description: desc,
      date: date,
      personId: personId,
      status: TaskStatus.pending,
    ));
    notifyListeners();
  }

  void updateTaskStatus(String id, TaskStatus status) {
    final idx = _tasks.indexWhere((t) => t.id == id);
    if (idx != -1) {
      final t = _tasks[idx];
      _tasks[idx] = ChurchTask(
        id: t.id,
        description: t.description,
        date: t.date,
        personId: t.personId,
        status: status,
      );
      notifyListeners();
    }
  }

  /// Bulk Quick Attendance Recording
  void quickRecordAttendance({
    required String date,
    required String dayName,
    required Map<String, AttendanceStatus> statusMap,
    required Map<String, String> excuseReasonMap,
    String? eventId,
  }) {
    for (int i = 0; i < _people.length; i++) {
      final p = _people[i];
      final status = statusMap[p.id] ?? AttendanceStatus.unexcused;
      final reason = (status == AttendanceStatus.excused) ? (excuseReasonMap[p.id] ?? '') : '';

      int? sessionNum;
      String computedDayName = dayName;

      // Handle Event tagging and Overload numbering
      if (eventId != null && eventId.isNotEmpty) {
        final ev = _events.firstWhere((e) => e.id == eventId, orElse: () => _events.first);
        final currentCount = p.getEventAttendanceCount(ev);
        sessionNum = currentCount + 1;
        if (sessionNum > ev.targetCount) {
          computedDayName = '${ev.name} - المرة رقم $sessionNum (Overload +${sessionNum - ev.targetCount} ⚡)';
        } else {
          computedDayName = '${ev.name} - المرة رقم $sessionNum';
        }
      }

      final newRecord = AttendanceRecord(
        date: date,
        status: status,
        excuseReason: reason,
        dayName: computedDayName,
        eventId: eventId,
        sessionNumber: sessionNum,
      );

      final updatedAttendance = List<AttendanceRecord>.from(p.attendance);
      final existingIndex = updatedAttendance.indexWhere((s) => s.date == date);
      if (existingIndex != -1) {
        updatedAttendance[existingIndex] = newRecord;
      } else {
        updatedAttendance.add(newRecord);
      }

      _people[i] = Person(
        id: p.id,
        name: p.name,
        attendance: updatedAttendance,
      );
    }
    notifyListeners();
  }

  // --- WhatsApp Text Generator ---
  String generateAdminBrief() {
    final dateStr = DateFormat('yyyy/MM/dd', 'ar').format(DateTime.now());
    final buffer = StringBuffer();
    buffer.writeln('📊 *تقرير متابعة الحضور والغياب والافتقاد*');
    buffer.writeln('🏛️ أسرة الأنبا أرسانيوس والقديس نيقولاوس لوسائل الإيضاح');
    buffer.writeln('📅 التاريخ: $dateStr');
    buffer.writeln('──────────────────────');
    buffer.writeln('👥 إجمالي المخدومين: $totalPeople');
    buffer.writeln('🎯 متوسط نسبة الالتزام الصافية: ${averageCommitment.toStringAsFixed(0)}%');
    buffer.writeln('🟡 إجمالي الاعتذارات: $totalExcusedSum | 🔴 بدون عذر: $totalUnexcusedSum');
    buffer.writeln('⚡ إجمالي نزول Overload الإضافي: +$totalOverloadSum');
    buffer.writeln('');

    final followupList = _people.where((p) => p.needsFollowUp).toList();
    if (followupList.isNotEmpty) {
      buffer.writeln('🚨 *حالات تحتاج افتقاد عاجل (غياب متتالي):*');
      for (int i = 0; i < followupList.length; i++) {
        final p = followupList[i];
        buffer.writeln('${i + 1}. ${p.name} (غائب آخر ${p.consecutiveAbsences} جلسات - التزام: ${p.commitmentRate.toStringAsFixed(0)}%)');
      }
      buffer.writeln('');
    }

    final topUnexcused = _people.where((p) => p.unexcusedCount > 0).toList()
      ..sort((a, b) => b.unexcusedCount.compareTo(a.unexcusedCount));
    if (topUnexcused.isNotEmpty) {
      buffer.writeln('🔴 *الأكثر غياباً بدون عذر:*');
      for (int i = 0; i < topUnexcused.take(5).length; i++) {
        final p = topUnexcused[i];
        buffer.writeln('${i + 1}. ${p.name}: ${p.unexcusedCount} غياب بدون إذن');
      }
      buffer.writeln('');
    }

    final frequentExcused = _people.where((p) => p.excusedCount > 0).toList()
      ..sort((a, b) => b.excusedCount.compareTo(a.excusedCount));
    if (frequentExcused.isNotEmpty) {
      buffer.writeln('🟡 *أصحاب الاعتذارات المسجلة:*');
      for (int i = 0; i < frequentExcused.take(5).length; i++) {
        final p = frequentExcused[i];
        final reasons = p.attendance.where((s) => s.isExcused && s.excuseReason.isNotEmpty).map((s) => s.excuseReason).toSet().join('، ');
        buffer.writeln('${i + 1}. ${p.name}: ${p.excusedCount} اعتذار ${reasons.isNotEmpty ? "($reasons)" : ""}');
      }
      buffer.writeln('');
    }

    buffer.writeln('✨ تم استخراج التقرير بواسطة نظام فلاتر للمتابعة السحابية');
    return buffer.toString();
  }

  String generatePersonMessage(Person p) {
    if (p.consecutiveAbsences >= 2) {
      return 'سلام ومحبة أ/ ${p.name} 🌹\nبنعمة ربنا بنسأل عليك ونطمن على أحوالك في أسرة الأنبا أرسانيوس والقديس نيقولاوس.\nاشتقنا لوجودك جداً ومكانك فارق في آخر الاجتماعات، بنصلي تكون كل أمورك بخير ومستنيين نشوفك في أقرب اجتماع ❤️';
    } else {
      return 'سلام ومحبة أ/ ${p.name} 🌹\nبنعمة ربنا بنسأل عليك ونطمن على صحتك وأخبارك، وحشتنا جداً وبنصلي تكون في كامل الصحة والبركة دايماً ✝️';
    }
  }
}
