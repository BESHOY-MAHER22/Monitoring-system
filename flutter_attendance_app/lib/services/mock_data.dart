import '../models/attendance_record.dart';
import '../models/church_event.dart';
import '../models/church_task.dart';
import '../models/person.dart';

class MockData {
  static List<ChurchEvent> getEvents() => [
    ChurchEvent(
      id: 'event-virgin-mary-fast',
      name: 'موسم صوم السيدة العذراء',
      description: 'نهضة وصوم ومعرض وسائل الإيضاح السنوي',
      startDate: '2026-08-07',
      endDate: '2026-08-22',
      targetCount: 2,
    ),
    ChurchEvent(
      id: 'event-easter-prep',
      name: 'موسم أسبوع الآلام وعيد القيامة',
      description: 'تجهيزات القبر والصلبوت والبانوراما',
      startDate: '2026-04-10',
      endDate: '2026-04-20',
      targetCount: 2,
    ),
  ];

  static List<ChurchTask> getTasks() => [
    ChurchTask(
      id: 'task-1',
      description: 'شراء 15 شارة لمارمينا',
      date: '2026-10-15',
      personId: '1',
      status: TaskStatus.completed,
    ),
    ChurchTask(
      id: 'task-2',
      description: 'تجهيز وسائل إيضاح درس التجسد',
      date: '2026-10-18',
      personId: '2',
      status: TaskStatus.inProgress,
    ),
    ChurchTask(
      id: 'task-3',
      description: 'فرز مخزن بيت العذراء',
      date: '2026-10-20',
      personId: '3',
      status: TaskStatus.pending,
    ),
  ];

  static List<Person> getPeople() => [
    Person(
      id: '1',
      name: 'فيلوباتير أمجد',
      attendance: [
        AttendanceRecord(date: '2026-10-01', status: AttendanceStatus.present, dayName: 'اجتماع الخدام'),
        AttendanceRecord(date: '2026-10-08', status: AttendanceStatus.present, dayName: 'درس كتاب'),
        AttendanceRecord(date: '2026-10-15', status: AttendanceStatus.excused, excuseReason: 'امتحانات ومذاكرة', dayName: 'اجتماع عام'),
        AttendanceRecord(date: '2026-10-22', status: AttendanceStatus.excused, excuseReason: 'امتحانات ومذاكرة', dayName: 'اجتماع صلاة'),
        AttendanceRecord(date: '2026-10-29', status: AttendanceStatus.present, dayName: 'اجتماع الخدام'),
        AttendanceRecord(date: '2026-11-05', status: AttendanceStatus.present, dayName: 'ورشة عمل'),
        // Event sessions: 3 sessions => target is 2 => Overload = 1
        AttendanceRecord(date: '2026-08-08', status: AttendanceStatus.present, dayName: 'صوم العذراء - المرة رقم 1', eventId: 'event-virgin-mary-fast'),
        AttendanceRecord(date: '2026-08-10', status: AttendanceStatus.present, dayName: 'صوم العذراء - المرة رقم 2', eventId: 'event-virgin-mary-fast'),
        AttendanceRecord(date: '2026-08-12', status: AttendanceStatus.present, dayName: 'صوم العذراء - المرة رقم 3 (Overload ⚡)', eventId: 'event-virgin-mary-fast'),
      ],
    ),
    Person(
      id: '2',
      name: 'مينا سمير',
      attendance: [
        AttendanceRecord(date: '2026-10-01', status: AttendanceStatus.present, dayName: 'اجتماع الخدام'),
        AttendanceRecord(date: '2026-10-08', status: AttendanceStatus.present, dayName: 'درس كتاب'),
        AttendanceRecord(date: '2026-10-15', status: AttendanceStatus.present, dayName: 'اجتماع عام'),
        AttendanceRecord(date: '2026-10-22', status: AttendanceStatus.present, dayName: 'اجتماع صلاة'),
        AttendanceRecord(date: '2026-10-29', status: AttendanceStatus.present, dayName: 'اجتماع الخدام'),
        AttendanceRecord(date: '2026-11-05', status: AttendanceStatus.present, dayName: 'ورشة عمل'),
      ],
    ),
    Person(
      id: '3',
      name: 'بيشوي عاطف',
      attendance: [
        AttendanceRecord(date: '2026-10-01', status: AttendanceStatus.present, dayName: 'اجتماع الخدام'),
        AttendanceRecord(date: '2026-10-08', status: AttendanceStatus.unexcused, dayName: 'درس كتاب'),
        AttendanceRecord(date: '2026-10-15', status: AttendanceStatus.unexcused, dayName: 'اجتماع عام'),
        AttendanceRecord(date: '2026-10-22', status: AttendanceStatus.unexcused, dayName: 'اجتماع صلاة'),
      ],
    ),
    Person(
      id: '4',
      name: 'كيرلس ناصر',
      attendance: [
        AttendanceRecord(date: '2026-10-01', status: AttendanceStatus.present, dayName: 'اجتماع الخدام'),
        AttendanceRecord(date: '2026-10-08', status: AttendanceStatus.present, dayName: 'درس كتاب'),
        AttendanceRecord(date: '2026-10-15', status: AttendanceStatus.excused, excuseReason: 'مرض ووعكة صحية', dayName: 'اجتماع عام'),
        AttendanceRecord(date: '2026-10-22', status: AttendanceStatus.unexcused, dayName: 'اجتماع صلاة'),
      ],
    ),
    Person(
      id: '5',
      name: 'ماريو عماد',
      attendance: [
        AttendanceRecord(date: '2026-10-01', status: AttendanceStatus.present, dayName: 'اجتماع الخدام'),
        AttendanceRecord(date: '2026-10-08', status: AttendanceStatus.present, dayName: 'درس كتاب'),
        AttendanceRecord(date: '2026-08-08', status: AttendanceStatus.present, dayName: 'صوم العذراء 1', eventId: 'event-virgin-mary-fast'),
        AttendanceRecord(date: '2026-08-10', status: AttendanceStatus.present, dayName: 'صوم العذراء 2', eventId: 'event-virgin-mary-fast'),
        AttendanceRecord(date: '2026-08-12', status: AttendanceStatus.present, dayName: 'صوم العذراء 3 (Overload +1)', eventId: 'event-virgin-mary-fast'),
        AttendanceRecord(date: '2026-08-14', status: AttendanceStatus.present, dayName: 'صوم العذراء 4 (Overload +2)', eventId: 'event-virgin-mary-fast'),
      ],
    ),
  ];
}
