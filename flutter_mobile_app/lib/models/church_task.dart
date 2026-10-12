enum TaskStatus {
  pending,      // قيد الانتظار
  inProgress,   // قيد التنفيذ
  completed,    // منجزة
  notCompleted, // لم تنجز
}

class ChurchTask {
  final String id;
  final String description;
  final String date;
  final String personId;
  final TaskStatus status;

  ChurchTask({
    required this.id,
    required this.description,
    required this.date,
    required this.personId,
    this.status = TaskStatus.pending,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'description': description,
    'date': date,
    'personId': personId,
    'status': status.name,
  };

  factory ChurchTask.fromJson(Map<String, dynamic> json) {
    TaskStatus s = TaskStatus.pending;
    final String val = json['status'] ?? '';
    if (val == 'completed') s = TaskStatus.completed;
    if (val == 'in-progress' || val == 'inProgress') s = TaskStatus.inProgress;
    if (val == 'not-completed' || val == 'notCompleted') s = TaskStatus.notCompleted;

    return ChurchTask(
      id: json['id'] ?? '',
      description: json['description'] ?? '',
      date: json['date'] ?? '',
      personId: json['personId'] ?? '',
      status: s,
    );
  }
}
