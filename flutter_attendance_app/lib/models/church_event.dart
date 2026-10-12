class ChurchEvent {
  final String id;
  final String name;
  final String description;
  final String startDate;
  final String endDate;
  final int targetCount; // الحد المستهدف قبل الـ Overload (الافتراضي 2)

  ChurchEvent({
    required this.id,
    required this.name,
    this.description = '',
    required this.startDate,
    this.endDate = '',
    this.targetCount = 2,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'description': description,
    'startDate': startDate,
    'endDate': endDate,
    'targetCount': targetCount,
  };

  factory ChurchEvent.fromJson(Map<String, dynamic> json) => ChurchEvent(
    id: json['id'] ?? '',
    name: json['name'] ?? '',
    description: json['description'] ?? '',
    startDate: json['startDate'] ?? '',
    endDate: json['endDate'] ?? '',
    targetCount: json['targetCount'] ?? 2,
  );
}
