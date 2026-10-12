enum AttendanceStatus {
  present,    // حاضر 🟢
  excused,    // غائب باعتذار 🟡
  unexcused,  // غائب بدون عذر 🔴
}

class AttendanceRecord {
  final String date;
  final AttendanceStatus status;
  final String excuseReason;
  final String dayName;
  final String? eventId;
  final int? sessionNumber;

  AttendanceRecord({
    required this.date,
    required this.status,
    this.excuseReason = '',
    this.dayName = '',
    this.eventId,
    this.sessionNumber,
  });

  bool get isPresent => status == AttendanceStatus.present;
  bool get isExcused => status == AttendanceStatus.excused;
  bool get isUnexcused => status == AttendanceStatus.unexcused;

  Map<String, dynamic> toJson() => {
    'date': date,
    'status': status.name,
    'excuseReason': excuseReason,
    'dayName': dayName,
    if (eventId != null) 'eventId': eventId,
    if (sessionNumber != null) 'sessionNumber': sessionNumber,
  };

  factory AttendanceRecord.fromJson(Map<String, dynamic> json) {
    AttendanceStatus status = AttendanceStatus.unexcused;
    final dynamic s = json['status'];
    final bool? excused = json['excused'];

    if (s == true || s == 'present') {
      status = AttendanceStatus.present;
    } else if (excused == true || s == 'excused') {
      status = AttendanceStatus.excused;
    } else {
      status = AttendanceStatus.unexcused;
    }

    return AttendanceRecord(
      date: json['date'] ?? '',
      status: status,
      excuseReason: json['excuseReason'] ?? '',
      dayName: json['dayName'] ?? '',
      eventId: json['eventId'],
      sessionNumber: json['sessionNumber'],
    );
  }
}
