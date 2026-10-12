// app.js - Firebase, Visual Analytics & Events Overload Management System
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    collection, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    getDocFromServer, 
    writeBatch 
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    projectId: "hybrid-bridge-9v9wh",
    appId: "1:916198524000:web:3b40c6b72361cdb80e6f05",
    apiKey: "AIzaSyDpq2lF5vePpuUJA28DKxGTKqn48jxd6wk",
    authDomain: "hybrid-bridge-9v9wh.firebaseapp.com",
    firestoreDatabaseId: "ai-studio-monitoringsystem-1b1013b5-ee3a-4c6d-83d8-db2c3e70058d",
    storageBucket: "hybrid-bridge-9v9wh.firebasestorage.app",
    messagingSenderId: "916198524000",
    oAuthClientId: "916198524000-gdpf2jcdcr3v68aqaulf6umgkvfflveq.apps.googleusercontent.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const API_URL = '/api';
const ADMIN_EMAIL = 'besoo5118@gmail.com';

// --- AUTH STATE & ROLES ---
let currentUser = null;
let currentUserRole = 'viewer'; // 'admin' | 'servant' | 'viewer'

function canEdit() {
    return currentUser && (currentUserRole === 'admin' || currentUserRole === 'servant');
}
function isAdmin() {
    return currentUser && currentUserRole === 'admin';
}

// Error Handler conformant to FirestoreErrorInfo specification
function handleFirestoreError(error, operationType, path) {
    const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        authInfo: {
            userId: auth.currentUser?.uid,
            email: auth.currentUser?.email,
            emailVerified: auth.currentUser?.emailVerified,
            isAnonymous: auth.currentUser?.isAnonymous,
            tenantId: auth.currentUser?.tenantId,
            providerInfo: auth.currentUser?.providerData?.map(provider => ({
                providerId: provider.providerId,
                email: provider.email,
            })) || []
        },
        operationType,
        path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    return errInfo;
}

// Anti-XSS Sanitization
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// --- UI ELEMENTS ---
const personNameInput = document.getElementById('personNameInput');
const addPersonBtn = document.getElementById('addPersonBtn');
const quickAddBtn = document.getElementById('quickAddBtn');
const addTaskBtn = document.getElementById('addTaskBtn');
const openAddEventModalBtn = document.getElementById('openAddEventModalBtn');
const addEventQuickBtn = document.getElementById('addEventQuickBtn');
const personCardsContainer = document.getElementById('personCardsContainer');
const loadingIndicator = document.getElementById('loadingIndicator');
const noDataMessage = document.getElementById('noDataMessage');
const connectionError = document.getElementById('connectionError');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const languageToggleBtn = document.getElementById('languageToggleBtn');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');
const connectionStatusDot = document.getElementById('connectionStatus');
const connectionStatusText = document.getElementById('connectionText');
const floatingSymbolsContainer = document.getElementById('floatingSymbols');

// Events UI
const eventsContainer = document.getElementById('eventsContainer');
const noEventsMessage = document.getElementById('noEventsMessage');
const addEventModal = document.getElementById('addEventModal');
const eventNameInput = document.getElementById('eventNameInput');
const eventDescriptionInput = document.getElementById('eventDescriptionInput');
const eventStartDateInput = document.getElementById('eventStartDateInput');
const eventEndDateInput = document.getElementById('eventEndDateInput');
const eventTargetInput = document.getElementById('eventTargetInput');
const saveEventBtn = document.getElementById('saveEventBtn');
const cancelEventBtn = document.getElementById('cancelEventBtn');

// Event Attendance & Overload Modal
const eventAttendanceModal = document.getElementById('eventAttendanceModal');
const eventModalTitle = document.getElementById('eventModalTitle');
const eventModalDates = document.getElementById('eventModalDates');
const deleteEventBtn = document.getElementById('deleteEventBtn');
const closeEventModalBtn = document.getElementById('closeEventModalBtn');
const eventAttendeesCount = document.getElementById('eventAttendeesCount');
const eventCompletedTargetCount = document.getElementById('eventCompletedTargetCount');
const eventOverloadCount = document.getElementById('eventOverloadCount');
const eventTotalSessionsCount = document.getElementById('eventTotalSessionsCount');
const eventSessionDateInput = document.getElementById('eventSessionDateInput');
const eventSessionNoteInput = document.getElementById('eventSessionNoteInput');
const eventSelectAllBtn = document.getElementById('eventSelectAllBtn');
const eventPeopleChecklist = document.getElementById('eventPeopleChecklist');
const confirmRecordEventSessionBtn = document.getElementById('confirmRecordEventSessionBtn');
const searchEventPersonInput = document.getElementById('searchEventPersonInput');
const eventRosterList = document.getElementById('eventRosterList');

// Analytics Modal
const personAnalyticsModal = document.getElementById('personAnalyticsModal');
const analyticsPersonName = document.getElementById('analyticsPersonName');
const closeAnalyticsBtn = document.getElementById('closeAnalyticsBtn');
const closeAnalyticsOkBtn = document.getElementById('closeAnalyticsOkBtn');
const metricCommitmentRate = document.getElementById('metricCommitmentRate');
const metricAttendanceRate = document.getElementById('metricAttendanceRate');
const metricTotalSessions = document.getElementById('metricTotalSessions');
const metricCountPresent = document.getElementById('metricCountPresent');
const metricCountExcused = document.getElementById('metricCountExcused');
const metricCountAbsent = document.getElementById('metricCountAbsent');
const metricTaskRate = document.getElementById('metricTaskRate');
const metricTotalOverload = document.getElementById('metricTotalOverload');

// Admin Insights & Executive Questions Solver UI
const adminInsightsSection = document.getElementById('adminInsightsSection');
const toggleAdminInsightsBtn = document.getElementById('toggleAdminInsightsBtn');
const toggleAdminInsightsText = document.getElementById('toggleAdminInsightsText');
const adminInsightsContent = document.getElementById('adminInsightsContent');
const copyAdminBriefBtn = document.getElementById('copyAdminBriefBtn');
const kpiTotalPeople = document.getElementById('kpiTotalPeople');
const kpiAvgCommitment = document.getElementById('kpiAvgCommitment');
const kpiUrgentFollowup = document.getElementById('kpiUrgentFollowup');
const kpiTotalUnexcused = document.getElementById('kpiTotalUnexcused');
const kpiTotalExcused = document.getElementById('kpiTotalExcused');
const kpiPerfectPeople = document.getElementById('kpiPerfectPeople');
const currentQuestionSubtitle = document.getElementById('currentQuestionSubtitle');
const questionTabsContainer = document.getElementById('questionTabsContainer');
const badgeUnexcusedCount = document.getElementById('badgeUnexcusedCount');
const badgeFollowupCount = document.getElementById('badgeFollowupCount');
const badgeExcusedCount = document.getElementById('badgeExcusedCount');
const badgeHonorsCount = document.getElementById('badgeHonorsCount');
const badgeOverloadCount = document.getElementById('badgeOverloadCount');
const insightsResultHeading = document.getElementById('insightsResultHeading');
const insightsSearchInput = document.getElementById('insightsSearchInput');
const insightsResultsList = document.getElementById('insightsResultsList');

let currentAdminQuestion = 'unexcused'; // 'unexcused' | 'followup' | 'excused' | 'honors' | 'overload'
let adminInsightsExpanded = true;

// Auth Bar UI
const loggedOutView = document.getElementById('loggedOutView');
const loggedInView = document.getElementById('loggedInView');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const userRoleBadge = document.getElementById('userRoleBadge');
const syncDataBtn = document.getElementById('syncDataBtn');

// Modals
const quickAddModal = document.getElementById('quickAddModal');
const quickAddCloseXBtn = document.getElementById('quickAddCloseXBtn');
const quickAddList = document.getElementById('quickAddList');
const dayNameInput = document.getElementById('dayNameInput');
const quickAddDateInput = document.getElementById('quickAddDateInput');
const markAllPresentBtn = document.getElementById('markAllPresentBtn');
const markAllAbsentBtn = document.getElementById('markAllAbsentBtn');
const quickAddSearchInput = document.getElementById('quickAddSearchInput');
const quickAddConfirmBtn = document.getElementById('quickAddConfirmBtn');
const quickAddCancelBtn = document.getElementById('quickAddCancelBtn');

const editNameModal = document.getElementById('editNameModal');
const editNameInput = document.getElementById('editNameInput');
const editNameSaveBtn = document.getElementById('editNameSaveBtn');
const editNameCancelBtn = document.getElementById('editNameCancelBtn');

const editDayModal = document.getElementById('editDayModal');
const closeEditDayXBtn = document.getElementById('closeEditDayXBtn');
const editDayNameInput = document.getElementById('editDayNameInput');
const editDateInput = document.getElementById('editDateInput');
const editDayAddList = document.getElementById('editDayAddList');
const editDaySaveBtn = document.getElementById('editDaySaveBtn');
const editDayCancelBtn = document.getElementById('editDayCancelBtn');

const personHistoryModal = document.getElementById('personHistoryModal');
const closePersonHistoryXBtn = document.getElementById('closePersonHistoryXBtn');
const closePersonHistoryBtn = document.getElementById('closePersonHistoryBtn');
const personHistoryTitle = document.getElementById('personHistoryTitle');
const personHistoryList = document.getElementById('personHistoryList');

// Reports & Export Center UI Elements
const openExportCenterBtn = document.getElementById('openExportCenterBtn');
const exportReportsModal = document.getElementById('exportReportsModal');
const closeExportModalBtn = document.getElementById('closeExportModalBtn');
const closeExportBottomBtn = document.getElementById('closeExportBottomBtn');
const exportScopeSelect = document.getElementById('exportScopeSelect');
const exportSpecificEventRow = document.getElementById('exportSpecificEventRow');
const exportSpecificEventSelect = document.getElementById('exportSpecificEventSelect');
const exportSpecificPersonRow = document.getElementById('exportSpecificPersonRow');
const exportSpecificPersonSelect = document.getElementById('exportSpecificPersonSelect');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const printReportBtn = document.getElementById('printReportBtn');
const refreshReportPreviewBtn = document.getElementById('refreshReportPreviewBtn');
const printableReportArea = document.getElementById('printableReportArea');
const previewMetaBadge = document.getElementById('previewMetaBadge');
const labelVersionSummary = document.getElementById('labelVersionSummary');
const labelVersionDetailed = document.getElementById('labelVersionDetailed');
const exportEventReportBtn = document.getElementById('exportEventReportBtn');
const exportPersonReportBtn = document.getElementById('exportPersonReportBtn');

let currentExportScope = 'all';
let currentExportVersion = 'summary'; // 'summary' | 'detailed'
let currentExportSpecificEventId = null;
let currentExportSpecificPersonId = null;

const dayDetailsModal = document.getElementById('dayDetailsModal');
const closeDayDetailsXBtn = document.getElementById('closeDayDetailsXBtn');
const closeDayDetailsBtn = document.getElementById('closeDayDetailsBtn');
const dayDetailsTitle = document.getElementById('dayDetailsTitle');
const dayDetailsList = document.getElementById('dayDetailsList');
const dayDetailsPresentCount = document.getElementById('dayDetailsPresentCount');
const dayDetailsExcusedCount = document.getElementById('dayDetailsExcusedCount');
const dayDetailsAbsentCount = document.getElementById('dayDetailsAbsentCount');

const daysListContainer = document.getElementById('daysListContainer');
const daysLoadingIndicator = document.getElementById('daysLoadingIndicator');
const noDaysMessage = document.getElementById('noDaysMessage');

// Task UI Elements
const addTaskModal = document.getElementById('addTaskModal');
const taskDescriptionInput = document.getElementById('taskDescriptionInput');
const taskDateInput = document.getElementById('taskDateInput');
const taskPeopleList = document.getElementById('taskPeopleList');
const addTaskConfirmBtn = document.getElementById('addTaskConfirmBtn');
const addTaskCancelBtn = document.getElementById('addTaskCancelBtn');

const editTaskModal = document.getElementById('editTaskModal');
const editTaskId = document.getElementById('editTaskId');
const editTaskDescriptionInput = document.getElementById('editTaskDescriptionInput');
const editTaskDateInput = document.getElementById('editTaskDateInput');
const editTaskStatus = document.getElementById('editTaskStatus');
const editTaskSaveBtn = document.getElementById('editTaskSaveBtn');
const editTaskCancelBtn = document.getElementById('editTaskCancelBtn');

const tasksListContainer = document.getElementById('tasksListContainer');
const tasksLoadingIndicator = document.getElementById('tasksLoadingIndicator');
const noTasksMessage = document.getElementById('noTasksMessage');

let currentEditingPersonId = null;
let currentEditingDay = null;
let currentPersonTasks = []; 
let currentActiveEventId = null;
let currentLanguage = localStorage.getItem('language') === 'en' ? 'en' : 'ar';

// Data Caches
let cachedPeople = [];
let cachedTasks = [];
let cachedEvents = [];
let isUsingFirestore = false;

// Chart.js instances cache
let chartInstances = {
    attendance: null,
    events: null,
    tasks: null,
    timeline: null,
    specificEvent: null
};

let currentRosterFilter = 'all'; // 'all' | 'attendees' | 'overload' | 'absent'
let currentAnalyticsPersonId = null;

// Translations
const translations = {
    'أسرة الانبا ارسانيوس والقديس نيقولاوس لوسائل الايضاح': 'St. Arsenius and St. Nicholas Family',
    'الحضور والمهام وإضافة أشخاص': 'Attendance, Tasks & People',
    'جاري الاتصال...': 'Connecting...', 'متصل': 'Connected', 'غير متصل': 'Disconnected',
    'متصل سحابياً ⚡': 'Cloud Connected ⚡',
    'الحضور السريع ⚡': 'Quick attendance ⚡', 'إضافة مهمة 📝': 'Add task 📝',
    'إضافة حدث / موسم 🎪': 'Add event / season 🎪',
    'الأحداث والمواسم والمناسبات الخاصة': 'Events & Special Seasons',
    '+ إضافة حدث جديد': '+ Add new event',
    'أدخل اسم شخص جديد': 'Enter a new person name', 'إضافة': 'Add',
    'جاري تحميل البيانات...': 'Loading data...',
    'لا يوجد أشخاص مضافة بعد. استخدم الحقل أعلاه لإضافة أول شخص.': 'No people have been added yet. Use the field above to add the first person.',
    'فشل في الاتصال بالسيرفر. يرجى التأكد من أن السيرفر يعمل بشكل صحيح.': 'Could not connect to server or database.',
    'قائمة الأيام المسجلة': 'Attendance days', 'جاري تحميل قائمة الأيام...': 'Loading attendance days...',
    'لا توجد أيام مسجلة بعد.': 'No attendance days recorded yet.', 'قائمة المهام': 'Tasks',
    'جاري تحميل قائمة المهام...': 'Loading tasks...', 'لا توجد مهام مسجلة بعد.': 'No tasks recorded yet.',
    'حسناً': 'OK', 'تأكيد': 'Confirm', 'هل أنت متأكد من حذف هذا الشخص؟': 'Are you sure you want to delete this person?',
    'نعم': 'Yes', 'لا': 'No', 'إلغاء': 'Cancel', 'حفظ': 'Save', 'حفظ وتحديث': 'Save and update',
    'إضافة سريعة ليوم جديد': 'Quick attendance for a new day', 'اسم اليوم (اختياري)': 'Day name (optional)',
    'مثال: اجتماع الخدام': 'e.g. Servants meeting', 'حدد الأشخاص الحاضرين لهذا اليوم.': 'Select the people who attended this day.',
    'وصف المهمة': 'Task description', 'مثال: شراء 15 شارة لمارمينا': 'e.g. Buy 15 badges for Mina',
    'تاريخ الاستحقاق': 'Due date', 'تعيين لـ (اختر شخصاً أو أكثر):': 'Assign to (select one or more people):',
    'تعديل المهمة': 'Edit task', 'الحالة (للجميع)': 'Status (for everyone)', 
    'قيد الانتظار': 'Pending', 'قيد التنفيذ': 'In progress', 'منجزة': 'Completed', 'لم يتم إنجازها': 'Not completed',
    'تعديل اليوم وإضافة حضور': 'Edit day and add attendance', 'التاريخ': 'Date',
    'إضافة أشخاص لم يتم تسجيل حضورهم:': 'Add people not marked present:',
    'تفاصيل الحضور ليوم': 'Attendance details for', 'تاريخ الحضور لـ': 'Attendance history for',
    'تعديل اسم الشخص': 'Edit person name', 'أدخل الاسم الجديد': 'Enter the new name',
    'إضافة مهمة جديدة': 'Add a new task', 'إضافة أشخاص': 'Add people', 'سجل الحضور': 'Attendance history',
    'لا يوجد تاريخ حضور لهذا الشخص.': 'No attendance history for this person.', 'المهام': 'Tasks',
    'لم يتم تعيين أي مهام لهذا الشخص.': 'No tasks have been assigned to this person.',
    'حاضر': 'Present', 'غائب': 'Absent', 'آخر حضور:': 'Last attendance:', 'حضور': 'attended',
    'مهام': 'tasks', 'لا يوجد': 'None', 'بتاريخ:': 'On:', 'عرض التفاصيل': 'View details', 
    'تعديل اليوم': 'Edit day', 'حذف اليوم': 'Delete day', 'تعديل المهمة (للجميع)': 'Edit task (everyone)',
    'حذف المهمة (للجميع)': 'Delete task (everyone)', 'يوم': 'Day', 'تحديد الكل': 'Select all',
    'الرجاء ملء وصف المهمة وتاريخ الاستحقاق.': 'Please enter a task description and due date.',
    'الرجاء اختيار شخص واحد على الأقل.': 'Please select at least one person.',
    'المهمة غير موجودة.': 'Task not found.', 'الوصف والتاريخ لا يمكن أن يكونا فارغين.': 'Description and date cannot be empty.',
    'تم تحديث المهمة بنجاح.': 'Task updated successfully.', 'تم حذف المهمة بنجاح.': 'Task deleted successfully.',
    'الجميع حاضرون في هذا اليوم! 🎉': 'Everyone is present today! 🎉',
    'لا توجد بيانات حضور لهذا اليوم.': 'No attendance data for this day.', 'تفاصيل حضور:': 'Attendance details:',
    'تم حذف اليوم بنجاح.': 'Day deleted successfully.', 'تم تحديث بيانات اليوم والحضور بنجاح.': 'Day and attendance updated successfully.',
    'الاسم لا يمكن أن يكون فارغاً.': 'Name cannot be empty.', 'خطأ': 'Error', 'نجاح': 'Success',
    'سجل لـ': 'History for', 'تاريخ الاستحقاق:': 'Due:', 'شعار العائلة': 'Family logo',
    'تصدير التقارير (CSV / PDF) 📊': 'Export Reports (CSV / PDF) 📊',
    'مركز تقارير الحضور والأحداث للمسؤولين': 'Attendance & Events Reports Center',
    'تصدير تقرير الحدث 📄': 'Export Event Report 📄',
    'تصدير تقرير الشخص (PDF / CSV) 📊': 'Export Person Report (PDF / CSV) 📊'
};

const arabicLetterMap = {
    'ا':'a','أ':'a','إ':'e','آ':'aa','ب':'b','ت':'t','ث':'th','ج':'g','ح':'h','خ':'kh','د':'d','ذ':'dh',
    'ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'','غ':'gh','ف':'f','ق':'q',
    'ك':'k','ل':'l','م':'m','ن':'n','ه':'h','و':'w','ؤ':'w','ي':'y','ى':'a','ئ':'y','ء':'','ة':'a','ﻻ':'la'
};

function transliterateArabic(value) {
    if (currentLanguage !== 'en') return value;
    const normalized = String(value).normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0640]/g, '');
    const latin = Array.from(normalized, character => arabicLetterMap[character] ?? character).join('');
    return latin.replace(/(^|[\s-])([a-z])/g, (_, boundary, letter) => boundary + letter.toUpperCase());
}

function translateText(value) {
    const entries = Object.entries(translations).sort((a, b) => b[0].length - a[0].length);
    return entries.reduce((text, [arabic, english]) => {
        const source = currentLanguage === 'en' ? arabic : english;
        const target = currentLanguage === 'en' ? english : arabic;
        return text.split(source).join(target);
    }, value);
}

function applyLanguageToPage() {
    const isEnglish = currentLanguage === 'en';
    document.documentElement.lang = isEnglish ? 'en' : 'ar';
    document.documentElement.dir = isEnglish ? 'ltr' : 'rtl';
    document.body.classList.toggle('ltr', isEnglish);
    languageToggleBtn.textContent = isEnglish ? '🇬🇧' : '🇪🇬';
    languageToggleBtn.title = isEnglish ? 'Switch to Arabic' : 'Switch to English';
    languageToggleBtn.setAttribute('aria-label', languageToggleBtn.title);
    document.title = isEnglish ? translations['أسرة الانبا ارسانيوس والقديس نيقولاوس لوسائل الايضاح'] : 'أسرة الانبا ارسانيوس والقديس نيقولاوس لوسائل الايضاح';

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let textNode;
    while ((textNode = walker.nextNode())) {
        const translated = translateText(textNode.nodeValue);
        if (translated !== textNode.nodeValue) textNode.nodeValue = translated;
    }
    document.querySelectorAll('[placeholder], [title], [alt]').forEach(element => {
        for (const attribute of ['placeholder', 'title', 'alt']) {
            if (element.hasAttribute(attribute)) element.setAttribute(attribute, translateText(element.getAttribute(attribute)));
        }
    });
}

function toggleLanguage() {
    currentLanguage = currentLanguage === 'ar' ? 'en' : 'ar';
    localStorage.setItem('language', currentLanguage);
    applyLanguageToPage();
    renderCardsFromCache();
    renderDaysListFromCache();
    renderTasksListFromCache();
    renderEvents();
}

function dateLocale() {
    return currentLanguage === 'en' ? 'en-GB' : 'ar-EG';
}

// Floating Coptic symbols
function createFloatingSymbols() {
    const symbols = [
        { class: 'cross', text: '✝' },
        { class: 'fish', text: '🐟' },
        { class: 'lamb', text: '🐑' },
        { class: 'book', text: '📖' },
        { class: 'censer', text: '🕯️' },
        { class: 'coptic', text: 'Ⲁ' },
        { class: 'coptic', text: 'Ⲃ' },
        { class: 'coptic', text: 'Ⲅ' },
        { class: 'coptic', text: 'Ⲇ' },
        { class: 'coptic', text: 'Ⲉ' }
    ];

    floatingSymbolsContainer.innerHTML = '';
    for (let i = 0; i < 20; i++) {
        const symbol = symbols[Math.floor(Math.random() * symbols.length)];
        const element = document.createElement('div');
        element.className = `symbol ${symbol.class}`;
        element.textContent = symbol.text;
        element.style.left = `${Math.random() * 100}vw`;
        element.style.top = `${Math.random() * 100}vh`;
        element.style.animationDelay = `${Math.random() * 20}s`;
        floatingSymbolsContainer.appendChild(element);
    }
}

// Custom Modal Alerts
function showCustomAlert(title, message) {
    return new Promise(resolve => {
        const modal = document.getElementById('customAlertModal');
        document.getElementById('modalTitle').innerText = title;
        document.getElementById('modalMessage').innerText = message;
        modal.style.display = 'flex';
        document.getElementById('modalOkBtn').onclick = () => {
            modal.style.display = 'none';
            resolve();
        };
    });
}

function showCustomConfirm(message) {
    return new Promise(resolve => {
        const modal = document.getElementById('customConfirmModal');
        document.getElementById('confirmMessage').innerText = message;
        modal.style.display = 'flex';
        document.getElementById('confirmYesBtn').onclick = () => {
            modal.style.display = 'none';
            resolve(true);
        };
        document.getElementById('confirmNoBtn').onclick = () => {
            modal.style.display = 'none';
            resolve(false);
        };
    });
}

function getRandomColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).slice(-2);
    }
    return color;
}

// --- DATA PROCESSING HELPERS ---
function calculatePeopleStats(people, tasks) {
    return people.map(person => {
        const attendance = Array.isArray(person.attendance) ? person.attendance : [];
        const attendedSessions = attendance.filter(s => s.status === true || s.status === 'present').length;
        const excusedSessions = attendance.filter(s => s.excused === true || s.status === 'excused').length;
        const unexcusedSessions = attendance.filter(s => !s.status && !s.excused && s.status !== 'excused' && s.status !== 'present').length;
        const totalSessions = attendance.length;

        // Commitment ratio according to user rule:
        // e.g., 6 meetings, 4 attended, 2 excused => required meetings = 4 => 4 / 4 = 100%!
        const requiredSessions = totalSessions - excusedSessions;
        let commitmentRatio = 0;
        if (requiredSessions > 0) {
            commitmentRatio = Math.min(1, attendedSessions / requiredSessions);
        } else if (totalSessions > 0 && excusedSessions === totalSessions) {
            commitmentRatio = 1; // All meetings excused with accepted reasons
        } else if (totalSessions === 0) {
            commitmentRatio = 0;
        }

        const attendanceRatio = totalSessions === 0 ? 0 : attendedSessions / totalSessions;

        // Streak analysis: Consecutive absences in latest meetings (from newest to oldest)
        const sortedSessions = [...attendance].sort((a, b) => new Date(b.date) - new Date(a.date));
        let consecutiveAbsences = 0;
        let consecutiveUnexcused = 0;
        let consecutiveExcused = 0;
        for (const session of sortedSessions) {
            const isPresent = session.status === true || session.status === 'present';
            const isExcused = session.excused === true || session.status === 'excused';
            if (!isPresent) {
                consecutiveAbsences++;
                if (isExcused) consecutiveExcused++;
                else consecutiveUnexcused++;
            } else {
                break;
            }
        }

        const personTasks = tasks.filter(t => t.personId === person.id);
        const totalTasks = personTasks.length;
        const completedTasks = personTasks.filter(t => t.status === 'completed').length;
        const taskRatio = totalTasks === 0 ? 0 : completedTasks / totalTasks;

        // Calculate Overload across all events
        let totalOverload = 0;
        cachedEvents.forEach(event => {
            const count = getPersonEventAttendanceCount(person.id, event.id);
            const target = event.targetCount || 2;
            if (count > target) {
                totalOverload += (count - target);
            }
        });

        // Needs Pastoral care / urgent visitation if consecutive absences >= 2 or unexcused >= 2
        const needsFollowUp = consecutiveAbsences >= 2 || unexcusedSessions >= 2;

        return {
            ...person,
            attendance,
            attendedSessions,
            excusedSessions,
            unexcusedSessions,
            totalSessions,
            requiredSessions,
            commitmentRatio,
            attendanceRatio,
            consecutiveAbsences,
            consecutiveUnexcused,
            consecutiveExcused,
            needsFollowUp,
            totalTasks,
            completedTasks,
            taskRatio,
            totalOverload
        };
    });
}

function deriveDaysList(people) {
    const daysMap = new Map();
    people.forEach(person => {
        const attendance = Array.isArray(person.attendance) ? person.attendance : [];
        attendance.forEach(session => {
            if (!daysMap.has(session.date)) {
                daysMap.set(session.date, {
                    date: session.date,
                    dayName: session.dayName || ''
                });
            }
        });
    });
    const days = Array.from(daysMap.values());
    days.sort((a, b) => new Date(b.date) - new Date(a.date));
    return days;
}

// Returns how many times a person attended a specific event
function getPersonEventAttendanceCount(personId, eventId) {
    const person = cachedPeople.find(p => p.id === personId);
    if (!person || !Array.isArray(person.attendance)) return 0;
    const event = cachedEvents.find(e => e.id === eventId);
    if (!event) return 0;

    return person.attendance.filter(s => {
        if (!s.status) return false;
        // Either explicitly tagged with eventId or matched by event name in dayName
        if (s.eventId === eventId) return true;
        if (s.dayName && s.dayName.includes(event.name)) return true;
        return false;
    }).length;
}

// --- RENDER PERSON CARDS ---
function renderCardsFromCache() {
    loadingIndicator.classList.add('hidden');
    connectionError.classList.add('hidden');
    personCardsContainer.innerHTML = '';

    const peopleWithStats = calculatePeopleStats(cachedPeople, cachedTasks);

    if (peopleWithStats.length === 0) {
        noDataMessage.classList.remove('hidden');
        return;
    }
    noDataMessage.classList.add('hidden');

    peopleWithStats.forEach((person) => {
        const card = document.createElement('div');
        card.className = 'person-card';
        card.setAttribute('data-id', person.id);

        const safeRawName = escapeHTML(person.name);
        const displayName = escapeHTML(transliterateArabic(person.name));
        const firstLetter = escapeHTML(displayName.charAt(0));
        const avatarColor = getRandomColor(person.name);
        const attendedSessions = person.attendedSessions;
        const excusedSessions = person.excusedSessions;
        const unexcusedSessions = person.unexcusedSessions;
        const totalSessions = person.totalSessions;
        const commitmentPercentage = (person.commitmentRatio * 100).toFixed(0);

        const completedTasks = person.completedTasks;
        const totalTasks = person.totalTasks;
        const taskRatio = totalTasks > 0 ? `${completedTasks}/${totalTasks}` : 'لا يوجد';
        const taskPercentage = totalTasks > 0 ? (person.taskRatio * 100).toFixed(0) : 0;

        let attendanceBoxClass = '';
        if (person.commitmentRatio === 1 && totalSessions > 0) {
            attendanceBoxClass = 'perfect';
        } else if (unexcusedSessions >= 3 || (totalSessions > 0 && person.commitmentRatio < 0.5)) {
            attendanceBoxClass = 'absent-critical';
        }

        let taskBoxClass = 'task-box';
        if (totalTasks > 0 && taskPercentage < 50) {
            taskBoxClass = 'task-box low-ratio';
        }

        const attendedSessionsList = person.attendance
            .filter(s => s.status)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        let lastAttendedDate = '-';
        if (attendedSessionsList.length > 0) {
            lastAttendedDate = new Date(attendedSessionsList[0].date).toLocaleDateString(dateLocale(), {
                day: 'numeric', month: 'long', year: 'numeric'
            });
        }

        const canPerformActions = canEdit();

        card.innerHTML = `
            <div class="absolute top-4 left-4 flex gap-1 z-20">
                <button class="analytics-person-btn p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-600 dark:text-amber-300 transition cursor-pointer" data-id="${escapeHTML(person.id)}" title="رسوم بيانية وإحصائيات">
                    📊
                </button>
                ${canPerformActions ? `
                <button class="edit-name-btn p-1.5 rounded-lg hover:bg-white/20 transition cursor-pointer" data-id="${escapeHTML(person.id)}" title="تعديل الاسم" style="color: inherit">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                </button>
                <button class="delete-person-btn p-1.5 rounded-lg hover:bg-white/20 transition cursor-pointer" data-id="${escapeHTML(person.id)}" title="حذف الشخص" style="color: inherit">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>` : ''}
            </div>
            <div class="avatar shadow-md" style="background: ${avatarColor};" data-id="${escapeHTML(person.id)}">
                ${firstLetter}
            </div>
            <h3 class="text-xl font-bold mt-2 cursor-pointer" data-id="${escapeHTML(person.id)}" data-raw-name="${safeRawName}">${displayName}</h3>
            
            ${person.totalOverload > 0 ? `
            <div class="mt-1 px-3 py-0.5 rounded-full text-xs font-bold bg-purple-500 text-white shadow-sm flex items-center gap-1">
                <span>⚡ Overload: +${person.totalOverload} نزول</span>
            </div>` : ''}

            ${person.needsFollowUp ? `
            <div class="mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 border border-red-500/30 text-red-700 dark:text-red-300 flex items-center gap-1">
                <span>⚠️ يحتاج افتقاد (غائب آخر ${person.consecutiveAbsences} جلسات)</span>
            </div>` : ''}

            <div class="attendance-box ${attendanceBoxClass}">
                <span>${commitmentPercentage}%</span>
                <span class="attendance-text mt-1">نسبة الالتزام بالعذر</span>
                <div class="flex items-center justify-center gap-1.5 mt-2 text-xs font-bold w-full">
                    <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-200" title="حاضر">🟢 ${attendedSessions}</span>
                    <span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200" title="غياب باعتذار">🟡 ${excusedSessions}</span>
                    <span class="px-1.5 py-0.5 rounded bg-red-500/20 text-red-800 dark:text-red-200" title="غياب بدون عذر">🔴 ${unexcusedSessions}</span>
                </div>
            </div>
            
            <div class="attendance-box ${taskBoxClass}">
                <span>${taskRatio}</span>
                <span class="attendance-text mt-1">${taskPercentage}% مهام</span>
            </div>
            
            <div class="mt-4 text-sm">
                <span>آخر حضور:</span>
                <span class="font-semibold">${lastAttendedDate}</span>
            </div>
        `;

        personCardsContainer.appendChild(card);
    });

    attachCardsEventListeners();
    renderAdminInsights();
}

function attachCardsEventListeners() {
    document.querySelectorAll('.analytics-person-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const personId = e.currentTarget.dataset.id;
            openPersonAnalyticsModal(personId);
        });
    });

    document.querySelectorAll('.edit-name-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!canEdit()) {
                showCustomAlert('تنبيه', 'يجب تسجيل الدخول بصلاحية خادم أو مسؤول لتعديل الأسماء.');
                return;
            }
            const personId = e.currentTarget.dataset.id;
            const person = cachedPeople.find(p => p.id === personId);
            if (person) {
                editNameInput.value = person.name;
                currentEditingPersonId = personId;
                editNameModal.style.display = 'flex';
            }
        });
    });

    document.querySelectorAll('.delete-person-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!canEdit()) {
                await showCustomAlert('تنبيه', 'يجب تسجيل الدخول بصلاحية خادم أو مسؤول لحذف الأشخاص.');
                return;
            }
            const personId = e.currentTarget.dataset.id;
            const person = cachedPeople.find(p => p.id === personId);
            const personName = person ? person.name : 'هذا الشخص';
            const confirmed = await showCustomConfirm(`هل أنت متأكد من حذف ${personName}؟`);
            if (confirmed) {
                await deletePerson(personId);
            }
        });
    });

    document.querySelectorAll('.person-card .avatar, .person-card h3').forEach(element => {
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            const personId = e.currentTarget.dataset.id;
            showPersonHistory(personId);
        });
    });
}

// ========================================================
// --- ADMIN EXECUTIVE INSIGHTS & QUESTIONS SOLVER ---
// ========================================================

function renderAdminInsights() {
    if (!adminInsightsSection) return;

    const peopleWithStats = calculatePeopleStats(cachedPeople, cachedTasks);
    const totalPeople = peopleWithStats.length;

    const totalAttendedSum = peopleWithStats.reduce((sum, p) => sum + p.attendedSessions, 0);
    const totalExcusedSum = peopleWithStats.reduce((sum, p) => sum + p.excusedSessions, 0);
    const totalUnexcusedSum = peopleWithStats.reduce((sum, p) => sum + p.unexcusedSessions, 0);

    const avgCommitment = totalPeople > 0
        ? Math.round(peopleWithStats.reduce((sum, p) => sum + (p.commitmentRatio * 100), 0) / totalPeople)
        : 0;

    const urgentFollowupPeople = peopleWithStats.filter(p => p.needsFollowUp);
    const perfectPeople = peopleWithStats.filter(p => p.commitmentRatio === 1 && p.totalSessions > 0 && p.unexcusedSessions === 0);
    const frequentExcusedPeople = peopleWithStats.filter(p => p.excusedSessions > 0);
    const highUnexcusedPeople = peopleWithStats.filter(p => p.unexcusedSessions > 0);
    const overloadHeroes = peopleWithStats.filter(p => p.totalOverload > 0);

    // Update KPI Numbers
    if (kpiTotalPeople) kpiTotalPeople.innerText = totalPeople;
    if (kpiAvgCommitment) kpiAvgCommitment.innerText = `${avgCommitment}%`;
    if (kpiUrgentFollowup) kpiUrgentFollowup.innerText = urgentFollowupPeople.length;
    if (kpiTotalUnexcused) kpiTotalUnexcused.innerText = totalUnexcusedSum;
    if (kpiTotalExcused) kpiTotalExcused.innerText = totalExcusedSum;
    if (kpiPerfectPeople) kpiPerfectPeople.innerText = perfectPeople.length;

    // Badges on Question Tabs
    if (badgeUnexcusedCount) badgeUnexcusedCount.innerText = highUnexcusedPeople.length;
    if (badgeFollowupCount) badgeFollowupCount.innerText = urgentFollowupPeople.length;
    if (badgeExcusedCount) badgeExcusedCount.innerText = frequentExcusedPeople.length;
    if (badgeHonorsCount) badgeHonorsCount.innerText = perfectPeople.length;
    if (badgeOverloadCount) badgeOverloadCount.innerText = overloadHeroes.length;

    renderAdminQuestionResults(currentAdminQuestion, peopleWithStats);
}

function renderAdminQuestionResults(qKey, peopleWithStats = null) {
    if (!insightsResultsList) return;
    if (!peopleWithStats) peopleWithStats = calculatePeopleStats(cachedPeople, cachedTasks);

    const searchTerm = (insightsSearchInput ? insightsSearchInput.value.trim().toLowerCase() : '');
    let filteredList = [];

    // Question-specific titles and data
    if (qKey === 'unexcused') {
        if (insightsResultHeading) {
            insightsResultHeading.innerHTML = `<span>🚨 الأكثر غياباً بدون عذر (تحتاج إنذار وتواصل فوري):</span>`;
        }
        if (currentQuestionSubtitle) {
            currentQuestionSubtitle.innerText = 'أشخاص لديهم غيابات بدون تقديم عذر أو اعتذار مسبق';
        }
        filteredList = peopleWithStats
            .filter(p => p.unexcusedSessions > 0)
            .sort((a, b) => b.unexcusedSessions - a.unexcusedSessions || b.totalSessions - a.totalSessions);
    } else if (qKey === 'followup') {
        if (insightsResultHeading) {
            insightsResultHeading.innerHTML = `<span>📞 قائمة الافتقاد العاجل (انقطاع متتالي عن آخر اجتماعين أو أكثر):</span>`;
        }
        if (currentQuestionSubtitle) {
            currentQuestionSubtitle.innerText = 'أشخاص غائبون لعدة اجتماعات متتالية ويحتاجون زيارة أو اتصال رعوي';
        }
        filteredList = peopleWithStats
            .filter(p => p.needsFollowUp)
            .sort((a, b) => b.consecutiveAbsences - a.consecutiveAbsences || b.unexcusedSessions - a.unexcusedSessions);
    } else if (qKey === 'excused') {
        if (insightsResultHeading) {
            insightsResultHeading.innerHTML = `<span>📝 أصحاب الاعتذارات المتكررة (متابعة الظروف الخاصة والأعذار):</span>`;
        }
        if (currentQuestionSubtitle) {
            currentQuestionSubtitle.innerText = 'أشخاص يعتذرون عن الحضور لمعرفة ظروفهم (مرض، امتحانات، سفر)';
        }
        filteredList = peopleWithStats
            .filter(p => p.excusedSessions > 0)
            .sort((a, b) => b.excusedSessions - a.excusedSessions);
    } else if (qKey === 'honors') {
        if (insightsResultHeading) {
            insightsResultHeading.innerHTML = `<span>🌟 لوحة الشرف (أعلى التزام بنسبة 100% وبدون أي غياب بدون إذن):</span>`;
        }
        if (currentQuestionSubtitle) {
            currentQuestionSubtitle.innerText = 'الخدام الأكثر انضباطاً والتزاماً بحضور كافة الاجتماعات المطلوبة';
        }
        filteredList = peopleWithStats
            .filter(p => p.commitmentRatio === 1 && p.totalSessions > 0 && p.unexcusedSessions === 0)
            .sort((a, b) => b.attendedSessions - a.attendedSessions);
    } else if (qKey === 'overload') {
        if (insightsResultHeading) {
            insightsResultHeading.innerHTML = `<span>⚡ أبطال الأحداث والمواسم والـ Overload (+نزول إضافي فوق المقرر):</span>`;
        }
        if (currentQuestionSubtitle) {
            currentQuestionSubtitle.innerText = 'أشخاص تجاوزوا الحد المستهدف للمواسم وحققوا نزولاً إضافياً';
        }
        filteredList = peopleWithStats
            .filter(p => p.totalOverload > 0)
            .sort((a, b) => b.totalOverload - a.totalOverload);
    }

    if (searchTerm) {
        filteredList = filteredList.filter(p => p.name.toLowerCase().includes(searchTerm));
    }

    insightsResultsList.innerHTML = '';

    if (filteredList.length === 0) {
        let emptyMsg = 'لا توجد بيانات مطابقة لهذا السؤال حالياً.';
        if (qKey === 'unexcused') emptyMsg = 'رائع! لا يوجد أي شخص لديه غياب بدون عذر 🎉 الجميع منتظم أو معتذر بعذر مسبق.';
        if (qKey === 'followup') emptyMsg = 'ممتاز! لا يوجد أي شخص منقطع أو بحاجة لافتقاد عاجل حالياً 👏.';
        if (qKey === 'excused') emptyMsg = 'لا توجد أي اعتذارات مسجلة.';
        if (qKey === 'overload') emptyMsg = 'لم يسجل أي شخص Overload في الأحداث بعد.';
        insightsResultsList.innerHTML = `
            <div class="text-center py-8 text-gray-500 bg-white/5 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <p class="text-sm font-bold">${emptyMsg}</p>
            </div>
        `;
        return;
    }

    filteredList.forEach((person, idx) => {
        const item = document.createElement('div');
        item.className = 'p-3 rounded-2xl bg-white/10 dark:bg-gray-800/80 border border-white/20 shadow-sm flex flex-wrap items-center justify-between gap-3 text-right hover:border-amber-500/50 transition';

        const displayName = escapeHTML(transliterateArabic(person.name));
        const avatarColor = getRandomColor(person.name);
        const commitmentPct = (person.commitmentRatio * 100).toFixed(0);

        // Extract excuse reasons for this person if any
        const reasons = person.attendance
            .filter(s => s.excused && s.excuseReason)
            .map(s => escapeHTML(s.excuseReason));
        const uniqueReasons = Array.from(new Set(reasons));

        let specificBadge = '';
        if (qKey === 'unexcused') {
            specificBadge = `
                <div class="flex items-center gap-1.5">
                    <span class="px-2.5 py-1 rounded-xl text-xs font-black bg-red-600 text-white shadow">
                        🔴 ${person.unexcusedSessions} غياب بدون إذن
                    </span>
                    <span class="text-xs text-gray-400">من أصل ${person.totalSessions} جلسة</span>
                </div>
            `;
        } else if (qKey === 'followup') {
            specificBadge = `
                <div class="flex items-center gap-1.5">
                    <span class="px-2.5 py-1 rounded-xl text-xs font-black bg-red-500/30 text-red-600 dark:text-red-400 border border-red-500/40">
                        ⚠️ غائب آخر ${person.consecutiveAbsences} اجتماعات متتالية
                    </span>
                </div>
            `;
        } else if (qKey === 'excused') {
            specificBadge = `
                <div class="flex flex-col items-start gap-1">
                    <span class="px-2.5 py-0.5 rounded-xl text-xs font-bold bg-amber-500/30 text-amber-600 dark:text-amber-300 border border-amber-500/40">
                        🟡 ${person.excusedSessions} اعتذار مقبول
                    </span>
                    ${uniqueReasons.length > 0 ? `<span class="text-[10px] text-gray-400">الأسباب: ${uniqueReasons.join('، ')}</span>` : ''}
                </div>
            `;
        } else if (qKey === 'honors') {
            specificBadge = `
                <div class="flex items-center gap-1.5">
                    <span class="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-500/30 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40">
                        👑 100% التزام معتبر
                    </span>
                    <span class="text-xs text-gray-400">(${person.attendedSessions} حضور ${person.excusedSessions > 0 ? `+ ${person.excusedSessions} عذر` : ''})</span>
                </div>
            `;
        } else if (qKey === 'overload') {
            specificBadge = `
                <div class="flex items-center gap-1.5">
                    <span class="px-2.5 py-1 rounded-xl text-xs font-black bg-purple-600 text-white shadow">
                        ⚡ Overload: +${person.totalOverload} نزول
                    </span>
                </div>
            `;
        }

        item.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-xs font-bold text-gray-400 w-5 text-center">${idx + 1}</span>
                <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white shadow-sm text-sm" style="background: ${avatarColor};">
                    ${displayName.charAt(0)}
                </div>
                <div>
                    <h4 class="font-bold text-sm cursor-pointer hover:text-amber-500 transition" onclick="showPersonHistory('${person.id}')">${displayName}</h4>
                    <div class="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                        <span>الالتزام بالعذر: <strong class="${person.commitmentRatio >= 0.75 ? 'text-emerald-600' : 'text-red-500'}">${commitmentPct}%</strong></span>
                        <span>•</span>
                        <span>حضور: ${person.attendedSessions}</span>
                        <span>•</span>
                        <span>عذر: ${person.excusedSessions}</span>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-3">
                ${specificBadge}
                <div class="flex items-center gap-1.5">
                    <button type="button" class="btn-copy-person-msg p-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs transition cursor-pointer" data-id="${escapeHTML(person.id)}" title="نسخ رسالة افتقاد / متابعة مخصصة">
                        💬 رسالة
                    </button>
                    <button type="button" class="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-600 dark:text-amber-300 text-xs transition cursor-pointer" onclick="openPersonAnalyticsModal('${person.id}')" title="رسوم بيانية">
                        📊
                    </button>
                </div>
            </div>
        `;
        insightsResultsList.appendChild(item);
    });

    // Attach copy message listener
    insightsResultsList.querySelectorAll('.btn-copy-person-msg').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pId = e.currentTarget.dataset.id;
            const p = cachedPeople.find(x => x.id === pId);
            if (!p) return;
            const stats = peopleWithStats.find(x => x.id === pId);
            let msg = `سلام ومحبة أ/ ${p.name} 🌹\n`;
            msg += `بنعمة ربنا بنسأل عليك ونطمن على أخبارك وأحوالك في أسرة الأنبا أرسانيوس والقديس نيقولاوس.\n`;
            if (stats && stats.consecutiveAbsences >= 2) {
                msg += `اشتقنا لوجودك معانا جداً ومكانك فارق في آخر الاجتماعات، بنصلي تكون كل أمورك بخير ومستنيين نشوفك في أقرب اجتماع ❤️\n`;
            } else {
                msg += `وحشتنا جداً وبنصلي تكون بكل خير وصحة دايماً ✝️\n`;
            }
            navigator.clipboard.writeText(msg).then(() => {
                showCustomAlert('تم نسخ الرسالة 💬', `تم نسخ رسالة افتقاد ومتابعة خاصة لـ ${p.name} بنجاح، يمكنك إرسالها له مباشرة على واتساب.`);
            }).catch(() => {
                showCustomAlert('تنبيه', 'تم تجهيز الرسالة.');
            });
        });
    });
}

function copyAdminBrief() {
    const peopleWithStats = calculatePeopleStats(cachedPeople, cachedTasks);
    const totalPeople = peopleWithStats.length;
    const avgCommitment = totalPeople > 0 
        ? Math.round(peopleWithStats.reduce((sum, p) => sum + (p.commitmentRatio * 100), 0) / totalPeople)
        : 0;
    const totalAttended = peopleWithStats.reduce((sum, p) => sum + p.attendedSessions, 0);
    const totalExcused = peopleWithStats.reduce((sum, p) => sum + p.excusedSessions, 0);
    const totalUnexcused = peopleWithStats.reduce((sum, p) => sum + p.unexcusedSessions, 0);
    const urgentFollowup = peopleWithStats.filter(p => p.needsFollowUp);
    const topUnexcused = peopleWithStats.filter(p => p.unexcusedSessions > 0).sort((a,b) => b.unexcusedSessions - a.unexcusedSessions).slice(0, 5);
    const frequentExcused = peopleWithStats.filter(p => p.excusedSessions > 0).sort((a,b) => b.excusedSessions - a.excusedSessions).slice(0, 5);
    const dateStr = new Date().toLocaleDateString('ar-EG');

    let text = `📊 *تقرير متابعة الحضور والغياب والافتقاد*\n`;
    text += `🏛️ أسرة الأنبا أرسانيوس والقديس نيقولاوس لوسائل الإيضاح\n`;
    text += `📅 التاريخ: ${dateStr}\n`;
    text += `──────────────────────\n`;
    text += `👥 إجمالي المخدومين: ${totalPeople}\n`;
    text += `🎯 متوسط نسبة الالتزام الصافية: ${avgCommitment}%\n`;
    text += `🟢 إجمالي الحضور: ${totalAttended} | 🟡 الاعتذارات: ${totalExcused} | 🔴 بدون عذر: ${totalUnexcused}\n\n`;

    if (urgentFollowup.length > 0) {
        text += `🚨 *حالات تحتاج افتقاد عاجل (غياب متتالي):*\n`;
        urgentFollowup.forEach((p, idx) => {
            text += `${idx + 1}. ${p.name} (غائب آخر ${p.consecutiveAbsences} جلسات - التزام: ${(p.commitmentRatio * 100).toFixed(0)}%)\n`;
        });
        text += `\n`;
    }

    if (topUnexcused.length > 0) {
        text += `🔴 *الأكثر غياباً بدون عذر:*\n`;
        topUnexcused.forEach((p, idx) => {
            text += `${idx + 1}. ${p.name}: ${p.unexcusedSessions} غياب بدون إذن\n`;
        });
        text += `\n`;
    }

    if (frequentExcused.length > 0) {
        text += `🟡 *أصحاب الاعتذارات المسجلة:*\n`;
        frequentExcused.forEach((p, idx) => {
            const reasons = p.attendance.filter(s => s.excused && s.excuseReason).map(s => s.excuseReason).join('، ');
            text += `${idx + 1}. ${p.name}: ${p.excusedSessions} اعتذار ${reasons ? `(${reasons})` : ''}\n`;
        });
        text += `\n`;
    }

    text += `✨ تم استخراج التقرير بواسطة نظام المتابعة السحابي`;

    navigator.clipboard.writeText(text).then(() => {
        showCustomAlert('تم النسخ بنجاح 📋', 'تم نسخ التقرير التنفيذي للمسؤول إلى الحافظة، يمكنك لصقه مباشرة في واتساب أو أي تطبيق للمشاركة.');
    }).catch(() => {
        showCustomAlert('خطأ', 'فشل النسخ إلى الحافظة.');
    });
}

// --- VISUAL CHARTS & ANALYTICS (CHART.JS) ---
function openPersonAnalyticsModal(personId) {
    const person = cachedPeople.find(p => p.id === personId);
    if (!person) {
        showCustomAlert('خطأ', 'لم يتم العثور على الشخص.');
        return;
    }

    analyticsPersonName.innerText = `تحليلات ورسوم بيانية لـ: ${transliterateArabic(person.name)}`;

    const attendance = Array.isArray(person.attendance) ? person.attendance : [];
    const attended = attendance.filter(s => s.status === true || s.status === 'present').length;
    const excused = attendance.filter(s => s.excused === true || s.status === 'excused').length;
    const unexcused = attendance.filter(s => !s.status && !s.excused && s.status !== 'excused' && s.status !== 'present').length;
    const total = attendance.length;

    // Commitment ratio according to user rule
    const required = total - excused;
    const commitmentRate = required > 0 
        ? Math.min(100, Math.round((attended / required) * 100))
        : (attended > 0 || excused > 0 ? 100 : 0);
    const actualRate = total > 0 ? Math.round((attended / total) * 100) : 0;

    const personTasks = cachedTasks.filter(t => t.personId === personId);
    const completedTasks = personTasks.filter(t => t.status === 'completed').length;
    const taskRate = personTasks.length > 0 ? ((completedTasks / personTasks.length) * 100).toFixed(0) : 0;

    // Calculate Overload for this person
    let totalOverload = 0;
    cachedEvents.forEach(event => {
        const count = getPersonEventAttendanceCount(personId, event.id);
        const target = event.targetCount || 2;
        if (count > target) totalOverload += (count - target);
    });

    if (metricCommitmentRate) metricCommitmentRate.innerText = `${commitmentRate}%`;
    if (metricAttendanceRate) metricAttendanceRate.innerText = `${actualRate}%`;
    if (metricTotalSessions) metricTotalSessions.innerText = `${attended} / ${total} جلسة`;
    if (metricCountPresent) metricCountPresent.innerText = `${attended} 🟢`;
    if (metricCountExcused) metricCountExcused.innerText = `${excused} 🟡`;
    if (metricCountAbsent) metricCountAbsent.innerText = `${unexcused} 🔴`;
    if (metricTaskRate) metricTaskRate.innerText = `${taskRate}% (${completedTasks}/${personTasks.length})`;
    if (metricTotalOverload) metricTotalOverload.innerText = `+${totalOverload} نزول`;

    currentAnalyticsPersonId = personId;

    // Render 4 Overall & Comparative Charts
    renderAttendanceDoughnut(attended, excused, unexcused);
    renderEventsBarChart(personId);
    renderTasksStatusChart(personTasks);
    renderMonthlyTimelineChart(attendance);

    // Render 5th Chart & Deep-Dive for Specific Event Commitment
    const selectElem = document.getElementById('analyticsEventSelect');
    if (selectElem) {
        selectElem.innerHTML = '';
        if (cachedEvents.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.innerText = 'لا توجد أحداث مسجلة بعد';
            selectElem.appendChild(opt);
            renderSpecificEventAnalysis(personId, null);
        } else {
            cachedEvents.forEach(ev => {
                const opt = document.createElement('option');
                opt.value = ev.id;
                opt.innerText = `${ev.name} (المطلوب: ${ev.targetCount || 2})`;
                selectElem.appendChild(opt);
            });
            selectElem.onchange = () => {
                renderSpecificEventAnalysis(personId, selectElem.value);
            };
            // Default to first event
            renderSpecificEventAnalysis(personId, cachedEvents[0].id);
        }
    }

    personAnalyticsModal.style.display = 'flex';
}

function renderAttendanceDoughnut(attendedCount, excusedCount, unexcusedCount) {
    if (chartInstances.attendance) chartInstances.attendance.destroy();
    const ctx = document.getElementById('attendanceDoughnutChart').getContext('2d');

    const total = attendedCount + excusedCount + unexcusedCount;
    const data = total === 0 ? [1] : [attendedCount, excusedCount, unexcusedCount];
    const labels = total === 0 ? ['لا توجد جلسات مسجلة'] : ['حاضر 🟢', 'غياب باعتذار 🟡', 'غياب بدون عذر 🔴'];
    const colors = total === 0 ? ['#9ca3af'] : ['#10b981', '#f59e0b', '#ef4444'];

    chartInstances.attendance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderEventsBarChart(personId) {
    if (chartInstances.events) chartInstances.events.destroy();
    const ctx = document.getElementById('eventsBarChart').getContext('2d');

    const eventNames = [];
    const regularCounts = [];
    const overloadCounts = [];

    if (cachedEvents.length === 0) {
        eventNames.push('لا توجد أحداث ومواسم مسجلة');
        regularCounts.push(0);
        overloadCounts.push(0);
    } else {
        cachedEvents.forEach(ev => {
            const count = getPersonEventAttendanceCount(personId, ev.id);
            const target = ev.targetCount || 2;
            const regular = Math.min(count, target);
            const overload = Math.max(0, count - target);

            eventNames.push(ev.name);
            regularCounts.push(regular);
            overloadCounts.push(overload);
        });
    }

    chartInstances.events = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: eventNames,
            datasets: [
                {
                    label: 'نزول عادي (الحد 2)',
                    data: regularCounts,
                    backgroundColor: '#3b82f6',
                    borderRadius: 6
                },
                {
                    label: 'نزول إضافي ⚡ Overload',
                    data: overloadCounts,
                    backgroundColor: '#f59e0b',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true },
                y: { 
                    stacked: true, 
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            },
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderTasksStatusChart(tasks) {
    if (chartInstances.tasks) chartInstances.tasks.destroy();
    const ctx = document.getElementById('tasksStatusChart').getContext('2d');

    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const notCompleted = tasks.filter(t => t.status === 'not-completed').length;

    const hasTasks = tasks.length > 0;
    const data = hasTasks ? [completed, inProgress, pending, notCompleted] : [1];
    const labels = hasTasks ? ['منجزة ✅', 'قيد التنفيذ 🔄', 'قيد الانتظار ⏳', 'لم تنجز ❌'] : ['لا توجد مهام'];
    const colors = hasTasks ? ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'] : ['#9ca3af'];

    chartInstances.tasks = new Chart(ctx, {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderMonthlyTimelineChart(attendance) {
    if (chartInstances.timeline) chartInstances.timeline.destroy();
    const ctx = document.getElementById('monthlyTimelineChart').getContext('2d');

    // Aggregate attended sessions by month (YYYY-MM)
    const monthMap = {};
    attendance.forEach(s => {
        if (!s.date) return;
        const monthKey = s.date.slice(0, 7); // e.g. "2025-08"
        if (!monthMap[monthKey]) monthMap[monthKey] = { attended: 0, total: 0 };
        monthMap[monthKey].total++;
        if (s.status) monthMap[monthKey].attended++;
    });

    const sortedMonths = Object.keys(monthMap).sort();
    const labels = sortedMonths.map(m => {
        const [year, month] = m.split('-');
        return `${month}/${year.slice(2)}`;
    });
    const attendedPoints = sortedMonths.map(m => monthMap[m].attended);

    chartInstances.timeline = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length > 0 ? labels : ['لا يوجد تاريخ'],
            datasets: [{
                label: 'عدد مرات الحضور',
                data: attendedPoints.length > 0 ? attendedPoints : [0],
                borderColor: '#ad813f',
                backgroundColor: 'rgba(173, 129, 63, 0.15)',
                fill: true,
                tension: 0.3,
                pointRadius: 5,
                pointBackgroundColor: '#ad813f'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            },
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// Chart 5: Render deep-dive commitment and overload for a specific event
function renderSpecificEventAnalysis(personId, eventId) {
    if (chartInstances.specificEvent) {
        chartInstances.specificEvent.destroy();
        chartInstances.specificEvent = null;
    }

    const person = cachedPeople.find(p => p.id === personId);
    if (!person) return;

    const event = cachedEvents.find(e => e.id === eventId);
    const canvas = document.getElementById('specificEventChart');
    const statusCard = document.getElementById('specificEventStatusCard');
    const sessionsList = document.getElementById('specificEventSessionsList');
    const sessionCountBadge = document.getElementById('specificEventSessionCountBadge');

    if (!event) {
        if (statusCard) {
            statusCard.innerHTML = '<p class="text-xs text-gray-500 text-center py-2">لا توجد أحداث مسجلة حتى الآن.</p>';
        }
        if (sessionsList) sessionsList.innerHTML = '<p class="text-xs text-gray-500 text-center">لا توجد سجلات</p>';
        if (sessionCountBadge) sessionCountBadge.innerText = '0 نزول';
        return;
    }

    const target = event.targetCount || 2;
    const totalCount = getPersonEventAttendanceCount(personId, event.id);
    const regularCount = Math.min(totalCount, target);
    const overloadCount = Math.max(0, totalCount - target);
    const remainingCount = Math.max(0, target - totalCount);

    // Filter all sessions for this person matching this event
    const eventSessions = (person.attendance || []).filter(s => {
        if (!s.status) return false;
        if (s.eventId === event.id) return true;
        if (s.dayName && s.dayName.includes(event.name)) return true;
        return false;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    if (sessionCountBadge) {
        sessionCountBadge.innerText = `${totalCount} نزول`;
    }

    // Status Card HTML
    let statusText = '';
    let statusBadgeColor = '';
    if (totalCount === 0) {
        statusText = `لم يسجل نزول في حدث "${event.name}" بعد. الحد المطلوب هو ${target} مرات نزول.`;
        statusBadgeColor = 'text-red-500 bg-red-500/10 border-red-500/20';
    } else if (totalCount < target) {
        statusText = `حضر ${totalCount} من أصل ${target} المطلوبة. متبقي ${remainingCount} نزول لاكتمال الحد العادي.`;
        statusBadgeColor = 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    } else if (totalCount === target) {
        statusText = `أكمل المطلوب بالكامل (${target}/${target}) في "${event.name}" ✅ بدون زيادة.`;
        statusBadgeColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    } else {
        statusText = `استوفى المطلوب (${target}/${target}) ولديه نشاط إضافي Overload ⚡ بمقدار +${overloadCount} نزول زيادة عن العادي!`;
        statusBadgeColor = 'text-purple-600 bg-purple-500/15 border-purple-500/30';
    }

    if (statusCard) {
        statusCard.innerHTML = `
            <div class="p-2.5 rounded-lg border ${statusBadgeColor} mb-2">
                <p class="text-xs font-bold">${escapeHTML(statusText)}</p>
            </div>
            <div class="grid grid-cols-3 gap-2 text-center text-xs">
                <div class="p-1.5 rounded-lg bg-emerald-500/10">
                    <span class="text-gray-500 block text-[10px]">النزول العادي</span>
                    <span class="font-bold text-emerald-600">${regularCount} / ${target}</span>
                </div>
                <div class="p-1.5 rounded-lg bg-amber-500/10">
                    <span class="text-gray-500 block text-[10px]">Overload ⚡</span>
                    <span class="font-bold text-amber-600">+${overloadCount}</span>
                </div>
                <div class="p-1.5 rounded-lg bg-blue-500/10">
                    <span class="text-gray-500 block text-[10px]">إجمالي النزول</span>
                    <span class="font-bold text-blue-600">${totalCount}</span>
                </div>
            </div>
        `;
    }

    // Render Sessions List
    if (sessionsList) {
        sessionsList.innerHTML = '';
        if (eventSessions.length === 0) {
            sessionsList.innerHTML = '<p class="text-xs text-gray-500 text-center py-2">لم يسجل أي نزول في هذا الحدث حتى الآن.</p>';
        } else {
            eventSessions.forEach((sess, idx) => {
                const sessionNum = idx + 1;
                const isOverloadSession = sessionNum > target;
                const dateStr = new Date(sess.date).toLocaleDateString(dateLocale(), {
                    day: 'numeric', month: 'short', year: 'numeric'
                });

                const sessItem = document.createElement('div');
                sessItem.className = `flex items-center justify-between p-1.5 rounded-lg border ${isOverloadSession ? 'border-amber-500/40 bg-amber-500/10' : 'border-white/10 bg-white/5'}`;
                sessItem.innerHTML = `
                    <div class="flex items-center gap-1.5">
                        <span class="text-xs font-bold ${isOverloadSession ? 'text-amber-500' : 'text-emerald-500'}">
                            ${isOverloadSession ? `⚡ Overload (+${sessionNum - target})` : `✓ المرة رقم ${sessionNum}`}
                        </span>
                        <span class="text-xs">${escapeHTML(sess.dayName || `${event.name} - المرة رقم ${sessionNum}`)}</span>
                    </div>
                    <span class="text-[11px] text-gray-400 font-mono">${dateStr}</span>
                `;
                sessionsList.appendChild(sessItem);
            });
        }
    }

    // Chart 5: Doughnut Chart
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const chartLabels = ['النزول العادي (الهدف 2)', 'Overload ⚡ (إضافي)', 'المتبقي للوصول للهدف'];
        const chartData = [regularCount, overloadCount, remainingCount];
        const chartColors = ['#10b981', '#f59e0b', '#6b7280'];

        chartInstances.specificEvent = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartData,
                    backgroundColor: chartColors,
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
                }
            }
        });
    }
}

// --- EVENTS MANAGEMENT & OVERLOAD SYSTEM ---
function renderEvents() {
    eventsContainer.innerHTML = '';

    if (cachedEvents.length === 0) {
        noEventsMessage.classList.remove('hidden');
        return;
    }
    noEventsMessage.classList.add('hidden');

    cachedEvents.forEach(event => {
        const card = document.createElement('div');
        card.className = 'day-item flex flex-col items-start gap-3 p-4 rounded-2xl relative shadow-md';
        card.style.background = 'var(--card-bg)';

        const target = event.targetCount || 2;
        let attendeesCount = 0;
        let completedTargetCount = 0;
        let totalOverloads = 0;
        let totalSessionsCount = (event.sessions || []).length;

        cachedPeople.forEach(p => {
            const count = getPersonEventAttendanceCount(p.id, event.id);
            if (count > 0) {
                attendeesCount++;
                if (count >= target) completedTargetCount++;
                if (count > target) totalOverloads += (count - target);
            }
        });

        const safeName = escapeHTML(event.name);
        const safeDesc = escapeHTML(event.description || '');

        card.innerHTML = `
            <div class="w-full flex items-center justify-between">
                <span class="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    الهدف: ${target} نزول
                </span>
                <span class="text-xl">🎪</span>
            </div>
            <div class="text-right w-full">
                <h3 class="text-lg font-bold" style="color: var(--card-text-color);">${safeName}</h3>
                ${safeDesc ? `<p class="text-xs text-gray-500 mt-0.5">${safeDesc}</p>` : ''}
                <p class="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    📅 من: <span class="font-semibold">${event.startDate}</span> ${event.endDate ? `إلى: <span class="font-semibold">${event.endDate}</span>` : ''}
                </p>
            </div>
            
            <div class="w-full grid grid-cols-3 gap-2 my-2 text-center text-xs">
                <div class="p-2 rounded-lg bg-blue-500/10">
                    <span class="text-gray-500 block">حاضرين</span>
                    <span class="font-bold text-blue-600 text-sm">${attendeesCount}</span>
                </div>
                <div class="p-2 rounded-lg bg-emerald-500/10">
                    <span class="text-gray-500 block">أكملوا (${target})</span>
                    <span class="font-bold text-emerald-600 text-sm">${completedTargetCount}</span>
                </div>
                <div class="p-2 rounded-lg bg-purple-500/10">
                    <span class="text-gray-500 block">Overload ⚡</span>
                    <span class="font-bold text-purple-600 text-sm">+${totalOverloads}</span>
                </div>
            </div>

            <button class="manage-event-btn w-full btn-primary text-xs py-2 rounded-xl flex items-center justify-center gap-2 cursor-pointer" data-id="${escapeHTML(event.id)}">
                <span>إدارة الحضور والـ Overload 📋</span>
            </button>
        `;

        eventsContainer.appendChild(card);
    });

    document.querySelectorAll('.manage-event-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const eventId = e.currentTarget.dataset.id;
            openEventAttendanceModal(eventId);
        });
    });
}

async function addEvent() {
    if (!canEdit()) {
        await showCustomAlert('تنبيه', 'يجب تسجيل الدخول بحساب خادم أو مسؤول لإضافة حدث.');
        return;
    }

    const name = eventNameInput.value.trim();
    const description = eventDescriptionInput.value.trim();
    const startDate = eventStartDateInput.value;
    const endDate = eventEndDateInput.value;
    const targetCount = Number(eventTargetInput.value) || 2;

    if (!name || !startDate) {
        await showCustomAlert('خطأ', 'الاسم وتاريخ البداية مطلوبان.');
        return;
    }

    const newId = String(Date.now());
    const newEvent = {
        id: newId,
        name,
        description,
        startDate,
        endDate,
        targetCount,
        sessions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        if (isUsingFirestore) {
            await setDoc(doc(db, 'events', newId), newEvent);
        } else {
            await fetch(`${API_URL}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEvent)
            });
            cachedEvents.push(newEvent);
            renderEvents();
        }

        addEventModal.style.display = 'none';
        eventNameInput.value = '';
        eventDescriptionInput.value = '';
        await showCustomAlert('نجاح', 'تمت إضافة الحدث بنجاح.');
    } catch (err) {
        handleFirestoreError(err, 'create', `events/${newId}`);
        await showCustomAlert('خطأ', 'فشل في حفظ الحدث.');
    }
}

async function deleteEvent(eventId) {
    if (!canEdit()) {
        await showCustomAlert('تنبيه', 'يجب تسجيل الدخول بحساب خادم أو مسؤول لحذف الحدث.');
        return;
    }

    const confirmed = await showCustomConfirm('هل أنت متأكد من حذف هذا الحدث؟ لن يتم حذف سجلات الحضور العامة للأشخاص.');
    if (!confirmed) return;

    try {
        if (isUsingFirestore) {
            await deleteDoc(doc(db, 'events', eventId));
        } else {
            await fetch(`${API_URL}/events/${eventId}`, { method: 'DELETE' });
            cachedEvents = cachedEvents.filter(e => e.id !== eventId);
            renderEvents();
        }
        eventAttendanceModal.style.display = 'none';
        await showCustomAlert('نجاح', 'تم حذف الحدث بنجاح.');
    } catch (err) {
        handleFirestoreError(err, 'delete', `events/${eventId}`);
        await showCustomAlert('خطأ', 'فشل في حذف الحدث.');
    }
}

function openEventAttendanceModal(eventId) {
    const event = cachedEvents.find(e => e.id === eventId);
    if (!event) return;
    currentActiveEventId = eventId;

    eventModalTitle.innerText = event.name;
    eventModalDates.innerText = `من: ${event.startDate} ${event.endDate ? `إلى: ${event.endDate}` : ''} | المطلوب: ${event.targetCount || 2} مرات نزول`;
    eventSessionDateInput.value = new Date().toISOString().slice(0, 10);
    eventSessionNoteInput.value = '';

    updateEventModalStatsAndRoster(event);
    eventAttendanceModal.style.display = 'flex';
}

function updateEventModalStatsAndRoster(event) {
    const target = event.targetCount || 2;
    let attendeesCount = 0;
    let completedTargetCount = 0;
    let totalOverloads = 0;
    const totalSessions = (event.sessions || []).length;

    cachedPeople.forEach(p => {
        const count = getPersonEventAttendanceCount(p.id, event.id);
        if (count > 0) {
            attendeesCount++;
            if (count >= target) completedTargetCount++;
            if (count > target) totalOverloads += (count - target);
        }
    });

    eventAttendeesCount.innerText = attendeesCount;
    eventCompletedTargetCount.innerText = completedTargetCount;
    eventOverloadCount.innerText = `+${totalOverloads}`;
    eventTotalSessionsCount.innerText = totalSessions;

    // Populate Checklist for new session
    eventPeopleChecklist.innerHTML = '';
    cachedPeople.forEach(person => {
        const count = getPersonEventAttendanceCount(person.id, event.id);
        let badgeColor = 'text-gray-500';
        let badgeText = `${count} / ${target}`;
        if (count >= target) {
            badgeColor = count > target ? 'text-amber-500 font-bold' : 'text-green-500 font-bold';
            if (count > target) badgeText += ` (Overload +${count - target} ⚡)`;
        }

        const label = document.createElement('label');
        label.className = 'quick-add-item flex items-center justify-between p-2 rounded-lg cursor-pointer';
        label.innerHTML = `
            <div class="flex items-center gap-2">
                <input type="checkbox" value="${escapeHTML(person.id)}" class="event-person-cb accent-blue-500 w-4 h-4 cursor-pointer">
                <span class="text-sm">${escapeHTML(transliterateArabic(person.name))}</span>
            </div>
            <span class="text-xs ${badgeColor}">${badgeText}</span>
        `;
        eventPeopleChecklist.appendChild(label);
    });

    // Populate Roster Table
    renderEventRoster(event);
}

function renderEventRoster(event) {
    eventRosterList.innerHTML = '';
    const target = event.targetCount || 2;
    const searchTerm = (searchEventPersonInput.value || '').trim().toLowerCase();

    const filtered = cachedPeople.filter(p => {
        const count = getPersonEventAttendanceCount(p.id, event.id);
        if (currentRosterFilter === 'attendees' && count === 0) return false;
        if (currentRosterFilter === 'overload' && count <= target) return false;
        if (currentRosterFilter === 'absent' && count > 0) return false;
        if (!searchTerm) return true;
        return p.name.toLowerCase().includes(searchTerm);
    });

    // Sort by count descending so top attendees/overloaders appear first
    filtered.sort((a, b) => {
        const countA = getPersonEventAttendanceCount(a.id, event.id);
        const countB = getPersonEventAttendanceCount(b.id, event.id);
        return countB - countA;
    });

    if (filtered.length === 0) {
        eventRosterList.innerHTML = '<p class="text-center text-gray-500 py-4 text-xs">لا توجد نتائج مطابقة للتصفية أو البحث المحدد.</p>';
        return;
    }

    filtered.forEach(person => {
        const count = getPersonEventAttendanceCount(person.id, event.id);
        const isOverload = count > target;
        const isCompleted = count >= target;
        const overloadCount = Math.max(0, count - target);

        let statusBadge = '';
        if (count === 0) {
            statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs bg-gray-500/20 text-gray-400 font-semibold">0 / ${target} (لم يحضر)</span>`;
        } else if (count < target) {
            statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs bg-blue-500/20 text-blue-600 font-semibold">${count} / ${target} (متبقي نزول ⏳)</span>`;
        } else if (count === target) {
            statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-600 font-bold">2 / 2 مكتمل ✅</span>`;
        } else {
            statusBadge = `<span class="px-2.5 py-1 rounded-full text-xs bg-amber-500 text-white font-bold shadow-sm">⚡ Overload +${overloadCount} (${count} مرات نزول)</span>`;
        }

        // Get this person's session entries for this event
        const personSessions = (person.attendance || []).filter(s => {
            if (!s.status) return false;
            return s.eventId === event.id || (s.dayName && s.dayName.includes(event.name));
        });

        let sessionsSummary = '';
        if (personSessions.length > 0) {
            sessionsSummary = personSessions.map((s, idx) => {
                const isOvr = (idx + 1) > target;
                return `<span class="inline-block text-[10px] px-1.5 py-0.5 rounded ${isOvr ? 'bg-amber-500/20 text-amber-500 font-bold' : 'bg-white/10 text-gray-300'} mr-1">المرة ${idx + 1}${isOvr ? ' ⚡' : ''}: ${s.date}</span>`;
            }).join(' ');
        }

        const row = document.createElement('div');
        row.className = 'flex flex-col p-3 rounded-xl border border-white/10 hover:bg-white/5 transition gap-1.5';
        row.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <span class="avatar text-sm w-9 h-9 mb-0" style="background: ${getRandomColor(person.name)}">${escapeHTML(person.name.charAt(0))}</span>
                    <div class="text-right">
                        <span class="font-bold text-sm block">${escapeHTML(transliterateArabic(person.name))}</span>
                        <span class="text-xs text-gray-400">
                            ${count === 0 ? 'لم يحضر بعد' : (count <= target ? `حضر ${count} من أصل ${target} المطلوبة` : `حضر ${count} مرات (${target} عادي + ${overloadCount} Overload ⚡)`)}
                        </span>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    ${statusBadge}
                    ${canEdit() ? `
                    <button class="add-single-event-attendance-btn px-2.5 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/40 text-xs font-bold text-blue-500 cursor-pointer flex items-center gap-1 transition" data-person-id="${escapeHTML(person.id)}" title="تسجيل نزول فوري لهذا الشخص">
                        <span>+ نزول</span>
                    </button>` : ''}
                </div>
            </div>
            ${sessionsSummary ? `
            <div class="flex flex-wrap items-center pt-1 border-t border-white/5">
                <span class="text-[10px] text-gray-400 ml-1">التواريخ:</span>
                ${sessionsSummary}
            </div>` : ''}
        `;
        eventRosterList.appendChild(row);
    });

    eventRosterList.querySelectorAll('.add-single-event-attendance-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const pid = e.currentTarget.dataset.personId;
            await recordEventAttendanceForPerson(event, pid, new Date().toISOString().slice(0, 10));
        });
    });
}

// Single person direct event attendance
async function recordEventAttendanceForPerson(event, personId, date, note = '') {
    if (!canEdit()) {
        await showCustomAlert('تنبيه', 'يجب تسجيل الدخول بحساب خادم أو مسؤول لتسجيل الحضور.');
        return;
    }

    const person = cachedPeople.find(p => p.id === personId);
    if (!person) return;

    const target = event.targetCount || 2;
    const currentCount = getPersonEventAttendanceCount(personId, event.id) + 1;

    let sessionName = `${event.name} - المرة رقم ${currentCount}`;
    if (currentCount > target) {
        sessionName += ` (Overload +${currentCount - target} ⚡)`;
    }
    if (note) {
        sessionName += ` [${note}]`;
    }

    const newSession = {
        date,
        status: true,
        dayName: sessionName,
        eventId: event.id
    };

    try {
        if (isUsingFirestore) {
            const updatedAttendance = [...(person.attendance || []), newSession];
            await updateDoc(doc(db, 'people', person.id), {
                attendance: updatedAttendance,
                updatedAt: new Date().toISOString()
            });

            // Update event sessions record
            const updatedSessions = [...(event.sessions || []), { date, personId, sessionNumber: currentCount, note }];
            await updateDoc(doc(db, 'events', event.id), {
                sessions: updatedSessions,
                updatedAt: new Date().toISOString()
            });
        }

        // Also sync to server API
        try {
            await fetch(`${API_URL}/events/${event.id}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, personIds: [personId], note })
            });
        } catch (e) {
            console.warn('Server session sync warn:', e);
        }

        if (!isUsingFirestore) {
            person.attendance = person.attendance || [];
            person.attendance.push(newSession);
            renderCardsFromCache();
            renderDaysListFromCache();
        }

        updateEventModalStatsAndRoster(event);
        renderEvents();
        await showCustomAlert('تم تسجيل الحضور 🎉', `تم تسجيل ${person.name} في ${event.name} (المرة رقم ${currentCount}${currentCount > target ? ` - Overload +${currentCount - target} ⚡` : ''}) بنجاح.`);
    } catch (err) {
        handleFirestoreError(err, 'write', `people/${person.id}`);
        await showCustomAlert('خطأ', 'فشل في تسجيل الحضور.');
    }
}

// Batch event attendance recording
async function recordBatchEventSession() {
    if (!canEdit()) {
        await showCustomAlert('تنبيه', 'يجب تسجيل الدخول بحساب خادم أو مسؤول لتسجيل الحضور.');
        return;
    }

    const event = cachedEvents.find(e => e.id === currentActiveEventId);
    if (!event) return;

    const date = eventSessionDateInput.value;
    const note = eventSessionNoteInput.value.trim();
    const selectedCheckboxes = eventPeopleChecklist.querySelectorAll('.event-person-cb:checked');
    const personIds = Array.from(selectedCheckboxes).map(cb => cb.value);

    if (!date) {
        await showCustomAlert('خطأ', 'تاريخ النزول مطلوب.');
        return;
    }
    if (personIds.length === 0) {
        await showCustomAlert('خطأ', 'الرجاء اختيار شخص واحد على الأقل.');
        return;
    }

    const target = event.targetCount || 2;

    try {
        if (isUsingFirestore) {
            let batch = writeBatch(db);
            const newEventSessions = [...(event.sessions || [])];

            for (const pid of personIds) {
                const person = cachedPeople.find(p => p.id === pid);
                if (!person) continue;

                const currentCount = getPersonEventAttendanceCount(pid, event.id) + 1;
                let sessionName = `${event.name} - المرة رقم ${currentCount}`;
                if (currentCount > target) {
                    sessionName += ` (Overload +${currentCount - target} ⚡)`;
                }
                if (note) {
                    sessionName += ` [${note}]`;
                }

                const newSession = {
                    date,
                    status: true,
                    dayName: sessionName,
                    eventId: event.id
                };

                const updatedAttendance = [...(person.attendance || []), newSession];
                batch.update(doc(db, 'people', pid), {
                    attendance: updatedAttendance,
                    updatedAt: new Date().toISOString()
                });

                newEventSessions.push({ date, personId: pid, sessionNumber: currentCount, note });
            }

            batch.update(doc(db, 'events', event.id), {
                sessions: newEventSessions,
                updatedAt: new Date().toISOString()
            });

            await batch.commit();
        }

        // Also sync to server API
        try {
            await fetch(`${API_URL}/events/${event.id}/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date, personIds, note })
            });
        } catch (e) {
            console.warn('Server batch session sync warn:', e);
        }

        if (!isUsingFirestore) {
            for (const pid of personIds) {
                const person = cachedPeople.find(p => p.id === pid);
                if (!person) continue;
                const currentCount = getPersonEventAttendanceCount(pid, event.id) + 1;
                let sessionName = `${event.name} - المرة رقم ${currentCount}`;
                if (currentCount > target) sessionName += ` (Overload +${currentCount - target} ⚡)`;
                if (note) sessionName += ` [${note}]`;
                person.attendance = person.attendance || [];
                person.attendance.push({ date, status: true, dayName: sessionName, eventId: event.id });
            }
            renderCardsFromCache();
            renderDaysListFromCache();
        }

        updateEventModalStatsAndRoster(event);
        renderEvents();
        await showCustomAlert('نجاح 🎉', `تم تسجيل نزول ${personIds.length} شخص في حدث "${event.name}" بنجاح مع تحديث عداد الحضور والـ Overload.`);
    } catch (err) {
        handleFirestoreError(err, 'write', 'events/batch-session');
        await showCustomAlert('خطأ', `فشل في تسجيل النزول: ${err.message}`);
    }
}

// --- STANDARD DAYS & TASKS RENDERING (PRESERVED) ---
function renderDaysListFromCache() {
    daysLoadingIndicator.classList.add('hidden');
    daysListContainer.innerHTML = '';

    const days = deriveDaysList(cachedPeople);

    if (days.length === 0) {
        noDaysMessage.classList.remove('hidden');
        return;
    }
    noDaysMessage.classList.add('hidden');

    const canPerformActions = canEdit();

    days.forEach((day) => {
        const dayItem = document.createElement('div');
        dayItem.className = 'day-item';

        const formattedDate = new Date(day.date).toLocaleDateString(dateLocale(), {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        const safeDayName = escapeHTML(day.dayName);
        const displayDayName = escapeHTML(transliterateArabic(day.dayName || (currentLanguage === 'en' ? 'Day' : 'يوم')));

        dayItem.innerHTML = `
            <div style="color: var(--card-text-color)">
                <p class="font-bold text-lg">${displayDayName}</p>
                <p class="text-sm">${formattedDate}</p>
            </div>
            <div class="day-actions">
                <button class="day-action-btn view-day-btn" data-date="${escapeHTML(day.date)}" title="عرض التفاصيل">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </button>
                ${canPerformActions ? `
                <button class="day-action-btn edit-day-btn" data-date="${escapeHTML(day.date)}" data-day-name="${safeDayName}" title="تعديل اليوم">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                </button>
                <button class="day-action-btn delete-day-btn" data-date="${escapeHTML(day.date)}" title="حذف اليوم">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>` : ''}
            </div>
        `;
        daysListContainer.appendChild(dayItem);
    });

    attachDaysEventListeners();
}

function attachDaysEventListeners() {
    document.querySelectorAll('.view-day-btn').forEach(button => {
        button.addEventListener('click', e => showDayDetails(e.currentTarget.dataset.date));
    });

    document.querySelectorAll('.edit-day-btn').forEach(button => {
        button.addEventListener('click', e => {
            if (!canEdit()) {
                showCustomAlert('تنبيه', 'يجب تسجيل الدخول بصلاحية خادم أو مسؤول لتعديل الأيام.');
                return;
            }
            const date = e.currentTarget.dataset.date;
            const dayName = e.currentTarget.dataset.dayName || '';
            currentEditingDay = { date, dayName };
            editDayNameInput.value = dayName;
            editDateInput.value = date;

            editDayAddList.innerHTML = '';
            if (cachedPeople.length === 0) {
                editDayAddList.innerHTML = '<p class="text-xs text-gray-500 text-center py-2">لا يوجد أشخاص مسجلين.</p>';
            } else {
                cachedPeople.forEach(person => {
                    const session = (person.attendance || []).find(s => s.date === date);
                    const isPresent = session ? (session.status === true || session.status === 'present') : false;
                    const isExcused = session ? (session.excused === true || session.status === 'excused') : false;
                    const excuseReason = (session && session.excuseReason) ? session.excuseReason : 'مرض ووعكة صحية';

                    const item = document.createElement('div');
                    item.className = 'edit-day-person-row p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800';
                    item.dataset.personId = person.id;

                    const displayName = escapeHTML(transliterateArabic(person.name));

                    item.innerHTML = `
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-semibold">${displayName}</span>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <div class="inline-flex rounded-lg p-0.5 bg-gray-200 dark:bg-gray-800 text-xs">
                                <label class="px-2 py-0.5 rounded cursor-pointer ${isPresent ? 'bg-emerald-600 text-white font-bold' : 'text-gray-600 dark:text-gray-300'} edit-label-present">
                                    <input type="radio" name="edit_status_${person.id}" value="present" class="hidden" ${isPresent ? 'checked' : ''}>
                                    🟢 حاضر
                                </label>
                                <label class="px-2 py-0.5 rounded cursor-pointer ${isExcused ? 'bg-amber-500 text-white font-bold' : 'text-gray-600 dark:text-gray-300'} edit-label-excused">
                                    <input type="radio" name="edit_status_${person.id}" value="excused" class="hidden" ${isExcused ? 'checked' : ''}>
                                    🟡 معتذر
                                </label>
                                <label class="px-2 py-0.5 rounded cursor-pointer ${(!isPresent && !isExcused) ? 'bg-red-600 text-white font-bold' : 'text-gray-600 dark:text-gray-300'} edit-label-absent">
                                    <input type="radio" name="edit_status_${person.id}" value="absent" class="hidden" ${(!isPresent && !isExcused) ? 'checked' : ''}>
                                    🔴 غائب
                                </label>
                            </div>
                            <div class="edit-excuse-wrapper ${isExcused ? 'flex' : 'hidden'} items-center">
                                <select class="edit-excuse-select text-[11px] py-0.5 px-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200">
                                    <option value="مرض ووعكة صحية" ${excuseReason.includes('مرض') ? 'selected' : ''}>🤒 مرض ووعكة صحية</option>
                                    <option value="امتحانات ومذاكرة" ${excuseReason.includes('امتحان') ? 'selected' : ''}>📚 امتحانات ومذاكرة</option>
                                    <option value="سفر" ${excuseReason.includes('سفر') ? 'selected' : ''}>✈️ سفر</option>
                                    <option value="ظروف عمل" ${excuseReason.includes('عمل') ? 'selected' : ''}>💼 ظروف عمل</option>
                                    <option value="ظرف أسري / طارئ" ${excuseReason.includes('أسري') || excuseReason.includes('طارئ') ? 'selected' : ''}>🏡 ظرف أسري / طارئ</option>
                                    <option value="أخرى" ${excuseReason === 'أخرى' ? 'selected' : ''}>📝 أخرى</option>
                                </select>
                            </div>
                        </div>
                    `;

                    const radios = item.querySelectorAll(`input[name="edit_status_${person.id}"]`);
                    const excuseWrap = item.querySelector('.edit-excuse-wrapper');
                    const lblP = item.querySelector('.edit-label-present');
                    const lblE = item.querySelector('.edit-label-excused');
                    const lblA = item.querySelector('.edit-label-absent');

                    radios.forEach(r => {
                        r.addEventListener('change', () => {
                            lblP.className = 'px-2 py-0.5 rounded cursor-pointer text-gray-600 dark:text-gray-300 edit-label-present';
                            lblE.className = 'px-2 py-0.5 rounded cursor-pointer text-gray-600 dark:text-gray-300 edit-label-excused';
                            lblA.className = 'px-2 py-0.5 rounded cursor-pointer text-gray-600 dark:text-gray-300 edit-label-absent';

                            if (r.value === 'present') {
                                lblP.className = 'px-2 py-0.5 rounded cursor-pointer bg-emerald-600 text-white font-bold edit-label-present';
                                excuseWrap.classList.add('hidden');
                                excuseWrap.classList.remove('flex');
                            } else if (r.value === 'excused') {
                                lblE.className = 'px-2 py-0.5 rounded cursor-pointer bg-amber-500 text-white font-bold edit-label-excused';
                                excuseWrap.classList.remove('hidden');
                                excuseWrap.classList.add('flex');
                            } else {
                                lblA.className = 'px-2 py-0.5 rounded cursor-pointer bg-red-600 text-white font-bold edit-label-absent';
                                excuseWrap.classList.add('hidden');
                                excuseWrap.classList.remove('flex');
                            }
                        });
                    });

                    editDayAddList.appendChild(item);
                });
            }

            editDayModal.style.display = 'flex';
        });
    });

    document.querySelectorAll('.delete-day-btn').forEach(button => {
        button.addEventListener('click', async e => {
            if (!canEdit()) {
                await showCustomAlert('تنبيه', 'يجب تسجيل الدخول بصلاحية خادم أو مسؤول لحذف الأيام.');
                return;
            }
            const date = e.currentTarget.dataset.date;
            const confirmed = await showCustomConfirm('هل أنت متأكد من حذف هذا اليوم؟ سيتم حذفه من سجلات جميع الأشخاص.');
            if (confirmed) await deleteDay(date);
        });
    });
}

function renderTasksListFromCache() {
    tasksLoadingIndicator.classList.add('hidden');
    tasksListContainer.innerHTML = '';

    if (cachedTasks.length === 0) {
        noTasksMessage.classList.remove('hidden');
        return;
    }
    noTasksMessage.classList.add('hidden');

    const peopleMap = new Map(cachedPeople.map(p => [p.id, p.name]));

    const groups = {};
    cachedTasks.forEach(task => {
        const key = task.batchId || task.id;
        if (!groups[key]) {
            groups[key] = {
                ...task,
                people: []
            };
        }
        groups[key].people.push({
            id: task.id,
            name: peopleMap.get(task.personId) || 'شخص محذوف 🗑️',
            status: task.status
        });
    });

    const groupedTasks = Object.values(groups);
    groupedTasks.sort((a, b) => new Date(b.date) - new Date(a.date));

    const canPerformActions = canEdit();

    groupedTasks.forEach((group) => {
        const taskItem = document.createElement('div');
        taskItem.className = 'day-item';

        const date = new Date(group.date).toLocaleDateString(dateLocale(), {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        const peopleHtml = group.people.map(p => {
            let icon = '⏳';
            let colorClass = 'text-yellow-600 dark:text-yellow-400';
            if (p.status === 'completed') { icon = '✅'; colorClass = 'text-green-600 dark:text-green-400'; }
            else if (p.status === 'in-progress') { icon = '🔄'; colorClass = 'text-blue-600 dark:text-blue-400'; }
            else if (p.status === 'not-completed') { icon = '❌'; colorClass = 'text-red-600 dark:text-red-400'; }

            return `<span class="person-tag ${colorClass}">${escapeHTML(transliterateArabic(p.name))} ${icon}</span>`;
        }).join('');

        const representativeId = group.people[0].id;

        taskItem.innerHTML = `
            <div class="flex-grow" style="color: var(--card-text-color)">
                <p class="font-bold text-lg">${escapeHTML(transliterateArabic(group.description))}</p>
                <p class="text-sm mt-1 text-gray-600 dark:text-gray-400">بتاريخ: <span class="font-semibold">${date}</span></p>
                <div class="mt-2 flex flex-wrap">
                    ${peopleHtml}
                </div>
            </div>
            ${canPerformActions ? `
            <div class="day-actions">
                <button class="day-action-btn edit-task-btn" data-id="${escapeHTML(representativeId)}" title="تعديل المهمة (للجميع)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                </button>
                <button class="day-action-btn delete-task-btn" data-id="${escapeHTML(representativeId)}" title="حذف المهمة (للجميع)">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
            </div>` : ''}
        `;
        tasksListContainer.appendChild(taskItem);
    });

    attachTasksEventListeners();
}

function attachTasksEventListeners() {
    document.querySelectorAll('.edit-task-btn').forEach(button => {
        button.addEventListener('click', e => {
            if (!canEdit()) {
                showCustomAlert('تنبيه', 'يجب تسجيل الدخول بصلاحية خادم أو مسؤول لتعديل المهام.');
                return;
            }
            showEditTaskModal(e.currentTarget.dataset.id);
        });
    });
    document.querySelectorAll('.delete-task-btn').forEach(button => {
        button.addEventListener('click', async e => {
            if (!canEdit()) {
                await showCustomAlert('تنبيه', 'يجب تسجيل الدخول بصلاحية خادم أو مسؤول لحذف المهام.');
                return;
            }
            const taskId = e.currentTarget.dataset.id;
            const confirmed = await showCustomConfirm('هل أنت متأكد من حذف هذه المهمة؟ (سيتم حذفها لجميع الأشخاص المشاركين فيها)');
            if (confirmed) await deleteTask(taskId);
        });
    });
}

// --- CRUD OPERATIONS (PEOPLE, DAYS, TASKS) ---
async function addPerson() {
    if (!canEdit()) {
        await showCustomAlert('تنبيه', 'يجب تسجيل الدخول بحساب خادم أو مسؤول لإضافة أشخاص.');
        return;
    }
    const name = personNameInput.value.trim();
    if (!name) {
        await showCustomAlert('خطأ', 'الاسم لا يمكن أن يكون فارغاً.');
        return;
    }

    const existing = cachedPeople.find(p => p.name.trim().toLowerCase() === name.toLowerCase());
    if (existing) {
        await showCustomAlert('خطأ', 'هذا الشخص مضاف بالفعل.');
        return;
    }

    const newId = String(Date.now());
    const newPerson = {
        id: newId,
        name,
        attendance: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    try {
        if (isUsingFirestore) {
            await setDoc(doc(db, 'people', newId), newPerson);
        } else {
            await fetch(`${API_URL}/people`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            cachedPeople.push(newPerson);
            renderCardsFromCache();
        }
        personNameInput.value = '';
    } catch (error) {
        handleFirestoreError(error, 'create', `people/${newId}`);
        await showCustomAlert('خطأ', 'فشل في إضافة الشخص.');
    }
}

async function updatePersonName() {
    if (!canEdit()) {
        await showCustomAlert('تنبيه', 'يجب تسجيل الدخول بحساب خادم أو مسؤول لتعديل الأسماء.');
        return;
    }
    const name = editNameInput.value.trim();
    if (!name || !currentEditingPersonId) {
        await showCustomAlert('خطأ', 'الاسم لا يمكن أن يكون فارغاً.');
        return;
    }

    try {
        if (isUsingFirestore) {
            await updateDoc(doc(db, 'people', currentEditingPersonId), {
                name,
                updatedAt: new Date().toISOString()
            });
        } else {
            await fetch(`${API_URL}/people/${currentEditingPersonId}/name`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            const p = cachedPeople.find(x => x.id === currentEditingPersonId);
            if (p) p.name = name;
            renderCardsFromCache();
            renderTasksListFromCache();
        }
        editNameModal.style.display = 'none';
    } catch (error) {
        handleFirestoreError(error, 'update', `people/${currentEditingPersonId}`);
        await showCustomAlert('خطأ', 'فشل في تحديث الاسم.');
    }
}

async function deletePerson(personId) {
    if (!canEdit()) {
        await showCustomAlert('تنبيه', 'يجب تسجيل الدخول بحساب خادم أو مسؤول لحذف الأشخاص.');
        return;
    }

    try {
        if (isUsingFirestore) {
            await deleteDoc(doc(db, 'people', personId));
            const relatedTasks = cachedTasks.filter(t => t.personId === personId);
            for (const t of relatedTasks) {
                await deleteDoc(doc(db, 'tasks', t.id));
            }
        } else {
            await fetch(`${API_URL}/people/${personId}`, { method: 'DELETE' });
            cachedPeople = cachedPeople.filter(p => p.id !== personId);
            cachedTasks = cachedTasks.filter(t => t.personId !== personId);
            renderCardsFromCache();
            renderDaysListFromCache();
            renderTasksListFromCache();
        }
    } catch (error) {
        handleFirestoreError(error, 'delete', `people/${personId}`);
        await showCustomAlert('خطأ', 'فشل في حذف الشخص.');
    }
}

function renderQuickAddList() {
    quickAddList.innerHTML = '';
    if (quickAddDateInput && !quickAddDateInput.value) {
        quickAddDateInput.value = new Date().toISOString().slice(0, 10);
    }

    if (cachedPeople.length === 0) {
        quickAddList.innerHTML = '<p class="text-center text-gray-500 py-4">لا يوجد أشخاص مضافين بعد.</p>';
        return;
    }

    const searchTerm = (quickAddSearchInput ? quickAddSearchInput.value.trim().toLowerCase() : '');
    const filteredPeople = cachedPeople.filter(p => {
        if (!searchTerm) return true;
        return p.name.toLowerCase().includes(searchTerm);
    });

    if (filteredPeople.length === 0) {
        quickAddList.innerHTML = '<p class="text-center text-gray-400 py-3 text-xs">لا يوجد نتائج مطابقة للبحث.</p>';
        return;
    }

    filteredPeople.forEach(person => {
        const item = document.createElement('div');
        item.className = 'quick-add-person-row p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-transparent hover:border-gray-300 dark:hover:border-gray-700';
        item.dataset.personId = person.id;

        const displayName = escapeHTML(transliterateArabic(person.name));
        const avatarColor = getRandomColor(person.name);

        item.innerHTML = `
            <div class="flex items-center gap-2.5 min-w-[160px]">
                <div class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-sm" style="background: ${avatarColor};">
                    ${displayName.charAt(0)}
                </div>
                <span class="text-sm font-bold text-gray-800 dark:text-gray-100">${displayName}</span>
            </div>

            <div class="flex flex-wrap items-center gap-2">
                <!-- Status Options -->
                <div class="inline-flex rounded-lg p-0.5 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-xs">
                    <label class="px-2 py-1 rounded-md cursor-pointer flex items-center gap-1 transition status-label-present bg-emerald-600 text-white font-bold">
                        <input type="radio" name="status_${person.id}" value="present" class="hidden quick-status-radio" checked>
                        <span>🟢 حاضر</span>
                    </label>
                    <label class="px-2 py-1 rounded-md cursor-pointer flex items-center gap-1 transition status-label-excused text-gray-600 dark:text-gray-300 hover:text-amber-500">
                        <input type="radio" name="status_${person.id}" value="excused" class="hidden quick-status-radio">
                        <span>🟡 معتذر</span>
                    </label>
                    <label class="px-2 py-1 rounded-md cursor-pointer flex items-center gap-1 transition status-label-absent text-gray-600 dark:text-gray-300 hover:text-red-500">
                        <input type="radio" name="status_${person.id}" value="absent" class="hidden quick-status-radio">
                        <span>🔴 بدون عذر</span>
                    </label>
                </div>

                <!-- Excuse Reason Selector (Revealed when excused) -->
                <div class="excuse-reason-wrapper hidden items-center gap-1">
                    <select class="excuse-reason-select text-xs py-1 px-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200">
                        <option value="مرض ووعكة صحية">🤒 مرض ووعكة صحية</option>
                        <option value="امتحانات ومذاكرة">📚 امتحانات ومذاكرة</option>
                        <option value="سفر">✈️ سفر</option>
                        <option value="ظروف عمل">💼 ظروف عمل</option>
                        <option value="ظرف أسري / طارئ">🏡 ظرف أسري / طارئ</option>
                        <option value="أخرى">📝 أخرى</option>
                    </select>
                </div>
            </div>
        `;

        // Handle Radio toggle styles & excuse selector reveal
        const radios = item.querySelectorAll(`input[name="status_${person.id}"]`);
        const excuseWrapper = item.querySelector('.excuse-reason-wrapper');
        const labelPresent = item.querySelector('.status-label-present');
        const labelExcused = item.querySelector('.status-label-excused');
        const labelAbsent = item.querySelector('.status-label-absent');

        radios.forEach(radio => {
            radio.addEventListener('change', () => {
                labelPresent.className = 'px-2 py-1 rounded-md cursor-pointer flex items-center gap-1 transition status-label-present text-gray-600 dark:text-gray-300';
                labelExcused.className = 'px-2 py-1 rounded-md cursor-pointer flex items-center gap-1 transition status-label-excused text-gray-600 dark:text-gray-300';
                labelAbsent.className = 'px-2 py-1 rounded-md cursor-pointer flex items-center gap-1 transition status-label-absent text-gray-600 dark:text-gray-300';

                if (radio.value === 'present') {
                    labelPresent.className = 'px-2 py-1 rounded-md cursor-pointer flex items-center gap-1 transition status-label-present bg-emerald-600 text-white font-bold';
                    excuseWrapper.classList.add('hidden');
                    excuseWrapper.classList.remove('flex');
                } else if (radio.value === 'excused') {
                    labelExcused.className = 'px-2 py-1 rounded-md cursor-pointer flex items-center gap-1 transition status-label-excused bg-amber-500 text-white font-bold';
                    excuseWrapper.classList.remove('hidden');
                    excuseWrapper.classList.add('flex');
                } else if (radio.value === 'absent') {
                    labelAbsent.className = 'px-2 py-1 rounded-md cursor-pointer flex items-center gap-1 transition status-label-absent bg-red-600 text-white font-bold';
                    excuseWrapper.classList.add('hidden');
                    excuseWrapper.classList.remove('flex');
                }
            });
        });

        quickAddList.appendChild(item);
    });
}

async function quickAddSessions() {
    if (!canEdit()) {
        await showCustomAlert('تنبيه', 'يجب تسجيل الدخول بحساب خادم أو مسؤول لتسجيل الحضور.');
        return;
    }

    const sessionDate = (quickAddDateInput && quickAddDateInput.value) 
        ? quickAddDateInput.value 
        : new Date().toISOString().slice(0, 10);
    const dayName = dayNameInput.value.trim();

    if (!sessionDate) {
        await showCustomAlert('خطأ', 'يرجى تحديد تاريخ الجلسة.');
        return;
    }

    const dateExists = cachedPeople.some(p => (p.attendance || []).some(s => s.date === sessionDate));
    if (dateExists) {
        const proceed = await showCustomConfirm(`يوجد بالفعل جلسة مسجلة لتاريخ (${sessionDate}). هل ترغب في تسجيل الحضور والغياب فوق هذا اليوم؟`);
        if (!proceed) return;
    }

    // Collect attendance mapping for each person
    const attendanceMap = {};
    const presentIds = [];

    const rows = quickAddList.querySelectorAll('.quick-add-person-row');
    rows.forEach(row => {
        const personId = row.dataset.personId;
        const selectedRadio = row.querySelector(`input[name="status_${personId}"]:checked`);
        const status = selectedRadio ? selectedRadio.value : 'absent';
        const reasonSelect = row.querySelector('.excuse-reason-select');
        const excuseReason = (status === 'excused' && reasonSelect) ? reasonSelect.value : '';

        const isPresent = (status === 'present');
        const isExcused = (status === 'excused');

        if (isPresent) presentIds.push(personId);

        attendanceMap[personId] = {
            status: isPresent ? 'present' : (isExcused ? 'excused' : 'absent'),
            excused: isExcused,
            excuseReason: excuseReason,
            date: sessionDate,
            dayName: dayName || ''
        };
    });

    try {
        if (isUsingFirestore) {
            let batch = writeBatch(db);
            let count = 0;
            for (const person of cachedPeople) {
                const update = attendanceMap[person.id] || { status: 'absent', excused: false, excuseReason: '' };
                const isPresent = update.status === 'present';
                const isExcused = update.status === 'excused';

                // Check if already has a record for this date
                const existingAttendance = person.attendance || [];
                const existingIdx = existingAttendance.findIndex(s => s.date === sessionDate);

                let updatedAttendance;
                const newRecord = {
                    date: sessionDate,
                    status: isPresent,
                    excused: isExcused,
                    excuseReason: isExcused ? (update.excuseReason || 'عذر مقبول') : '',
                    dayName: dayName || ''
                };

                if (existingIdx !== -1) {
                    updatedAttendance = [...existingAttendance];
                    updatedAttendance[existingIdx] = newRecord;
                } else {
                    updatedAttendance = [...existingAttendance, newRecord];
                }

                batch.update(doc(db, 'people', person.id), {
                    attendance: updatedAttendance,
                    updatedAt: new Date().toISOString()
                });
                count++;
                if (count % 400 === 0) {
                    await batch.commit();
                    batch = writeBatch(db);
                }
            }
            await batch.commit();
        } else {
            await fetch(`${API_URL}/quick-session-all`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ presentIds, attendanceMap, date: sessionDate, dayName })
            });

            cachedPeople.forEach(person => {
                person.attendance = person.attendance || [];
                const update = attendanceMap[person.id] || { status: 'absent', excused: false, excuseReason: '' };
                const isPresent = update.status === 'present';
                const isExcused = update.status === 'excused';

                const existingIdx = person.attendance.findIndex(s => s.date === sessionDate);
                const newRecord = {
                    date: sessionDate,
                    status: isPresent,
                    excused: isExcused,
                    excuseReason: isExcused ? (update.excuseReason || 'عذر مقبول') : '',
                    dayName: dayName || ''
                };

                if (existingIdx !== -1) {
                    person.attendance[existingIdx] = newRecord;
                } else {
                    person.attendance.push(newRecord);
                }
            });
            renderCardsFromCache();
            renderDaysListFromCache();
        }

        quickAddModal.style.display = 'none';
        dayNameInput.value = '';
        await showCustomAlert('نجاح', `تم تسجيل واعتماد الحضور والغياب والاعتذارات لتاريخ (${sessionDate}) بنجاح! 🎉`);
    } catch (error) {
        handleFirestoreError(error, 'write', 'people/batch-attendance');
        await showCustomAlert('خطأ', `فشل في تسجيل الحضور: ${error.message}`);
    }
}

function populatePersonChecklist() {
    taskPeopleList.innerHTML = '';
    if (cachedPeople.length === 0) {
        taskPeopleList.innerHTML = '<p class="text-center text-gray-500 p-2">لا يوجد أشخاص.</p>';
        return;
    }

    const selectAllContainer = document.createElement('div');
    selectAllContainer.className = 'flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700 mb-2';
    selectAllContainer.innerHTML = `
        <input type="checkbox" id="selectAllTasks" class="accent-blue-500 w-4 h-4 cursor-pointer">
        <label for="selectAllTasks" class="text-sm font-bold cursor-pointer">تحديد الكل</label>
    `;
    taskPeopleList.appendChild(selectAllContainer);

    const selectAllCb = selectAllContainer.querySelector('#selectAllTasks');
    selectAllCb.addEventListener('change', (e) => {
        const checkboxes = taskPeopleList.querySelectorAll('.person-task-cb');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
    });

    cachedPeople.forEach(person => {
        const item = document.createElement('label');
        item.className = 'flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer';
        item.innerHTML = `
            <input type="checkbox" value="${escapeHTML(person.id)}" class="person-task-cb accent-blue-500 w-4 h-4 cursor-pointer">
            <span class="text-sm">${escapeHTML(transliterateArabic(person.name))}</span>
        `;
        taskPeopleList.appendChild(item);
    });
}

async function addTask() {
    if (!canEdit()) {
        await showCustomAlert('تنبيه', 'يجب تسجيل الدخول بحساب خادم أو مسؤول لإضافة مهام.');
        return;
    }

    const description = taskDescriptionInput.value.trim();
    const date = taskDateInput.value;
    const selectedCheckboxes = taskPeopleList.querySelectorAll('.person-task-cb:checked');
    const personIds = Array.from(selectedCheckboxes).map(cb => cb.value);

    if (!description || !date) {
        await showCustomAlert('خطأ', 'الرجاء ملء وصف المهمة وتاريخ الاستحقاق.');
        return;
    }
    if (personIds.length === 0) {
        await showCustomAlert('خطأ', 'الرجاء اختيار شخص واحد على الأقل.');
        return;
    }

    const batchId = String(Date.now());

    try {
        if (isUsingFirestore) {
            let batch = writeBatch(db);
            personIds.forEach((pid, idx) => {
                const taskId = `${batchId}-${idx}`;
                const taskDoc = {
                    id: taskId,
                    batchId,
                    description,
                    personId: pid,
                    date,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                batch.set(doc(db, 'tasks', taskId), taskDoc);
            });
            await batch.commit();
        } else {
            await fetch(`${API_URL}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description, personIds, date, status: 'pending' })
            });
            personIds.forEach((pid, idx) => {
                cachedTasks.push({
                    id: `${batchId}-${idx}`,
                    batchId,
                    description,
                    personId: pid,
                    date,
                    status: 'pending'
                });
            });
            renderTasksListFromCache();
            renderCardsFromCache();
        }

        addTaskModal.style.display = 'none';
        taskDescriptionInput.value = '';
        taskDateInput.value = new Date().toISOString().slice(0, 10);
        await showCustomAlert('نجاح', `تم إضافة المهمة لـ ${personIds.length} شخص بنجاح.`);
    } catch (error) {
        handleFirestoreError(error, 'create', 'tasks/batch');
        await showCustomAlert('خطأ', `فشل في إضافة المهمة: ${error.message}`);
    }
}

function showEditTaskModal(taskId) {
    const task = cachedTasks.find(t => t.id === taskId);
    if (!task) {
        showCustomAlert('خطأ', 'المهمة غير موجودة.');
        return;
    }

    editTaskId.value = task.id;
    editTaskDescriptionInput.value = task.description;
    editTaskDateInput.value = task.date;
    editTaskStatus.value = task.status;
    editTaskModal.style.display = 'flex';
}

async function updateTask() {
    if (!canEdit()) {
        await showCustomAlert('تنبيه', 'يجب تسجيل الدخول بحساب خادم أو مسؤول لتعديل المهام.');
        return;
    }

    const taskId = editTaskId.value;
    const newDescription = editTaskDescriptionInput.value.trim();
    const newDate = editTaskDateInput.value;
    const newStatus = editTaskStatus.value;

    if (!newDescription || !newDate) {
        await showCustomAlert('خطأ', 'الوصف والتاريخ لا يمكن أن يكونا فارغين.');
        return;
    }

    const targetTask = cachedTasks.find(t => t.id === taskId);
    if (!targetTask) return;
    const batchId = targetTask.batchId;

    try {
        if (isUsingFirestore) {
            let batch = writeBatch(db);
            const tasksToUpdate = batchId 
                ? cachedTasks.filter(t => t.batchId === batchId)
                : [targetTask];

            tasksToUpdate.forEach(t => {
                batch.update(doc(db, 'tasks', t.id), {
                    description: newDescription,
                    date: newDate,
                    status: newStatus,
                    updatedAt: new Date().toISOString()
                });
            });
            await batch.commit();
        } else {
            await fetch(`${API_URL}/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: newDescription, date: newDate, status: newStatus })
            });
            cachedTasks.forEach(t => {
                if ((batchId && t.batchId === batchId) || t.id === taskId) {
                    t.description = newDescription;
                    t.date = newDate;
                    t.status = newStatus;
                }
            });
            renderTasksListFromCache();
            renderCardsFromCache();
        }

        editTaskModal.style.display = 'none';
        await showCustomAlert('نجاح', 'تم تحديث المهمة بنجاح.');
    } catch (error) {
        handleFirestoreError(error, 'update', `tasks/${taskId}`);
        await showCustomAlert('خطأ', `فشل في تحديث المهمة: ${error.message}`);
    }
}

async function deleteTask(taskId) {
    if (!canEdit()) {
        await showCustomAlert('تنبيه', 'يجب تسجيل الدخول بحساب خادم أو مسؤول لحذف المهام.');
        return;
    }

    const targetTask = cachedTasks.find(t => t.id === taskId);
    if (!targetTask) return;
    const batchId = targetTask.batchId;

    try {
        if (isUsingFirestore) {
            let batch = writeBatch(db);
            const tasksToDelete = batchId 
                ? cachedTasks.filter(t => t.batchId === batchId)
                : [targetTask];

            tasksToDelete.forEach(t => {
                batch.delete(doc(db, 'tasks', t.id));
            });
            await batch.commit();
        } else {
            await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
            cachedTasks = cachedTasks.filter(t => batchId ? t.batchId !== batchId : t.id !== taskId);
            renderTasksListFromCache();
            renderCardsFromCache();
        }

        await showCustomAlert('نجاح', 'تم حذف المهمة بنجاح.');
    } catch (error) {
        handleFirestoreError(error, 'delete', `tasks/${taskId}`);
        await showCustomAlert('خطأ', 'فشل في حذف المهمة.');
    }
}

function showPersonHistory(personId) {
    const person = cachedPeople.find(p => p.id === personId);
    if (!person) {
        showCustomAlert('خطأ', 'الشخص غير موجود.');
        return;
    }

    personHistoryTitle.innerHTML = `سجل لـ <span>${escapeHTML(transliterateArabic(person.name))}</span>`;
    personHistoryList.innerHTML = '';

    // Add Analytics Shortcut Button inside history
    const analyticsBtnContainer = document.createElement('div');
    analyticsBtnContainer.className = 'my-2 flex justify-end';
    analyticsBtnContainer.innerHTML = `
        <button class="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow flex items-center gap-1 cursor-pointer transition">
            <span>📊 عرض الرسوم البيانية ومعدل الالتزام</span>
        </button>
    `;
    analyticsBtnContainer.querySelector('button').addEventListener('click', () => {
        personHistoryModal.style.display = 'none';
        openPersonAnalyticsModal(personId);
    });
    personHistoryList.appendChild(analyticsBtnContainer);

    // Attendance History Header
    const attendanceHeader = document.createElement('h3');
    attendanceHeader.className = 'text-xl font-bold mt-4 mb-2 text-blue-800 dark:text-blue-300';
    attendanceHeader.innerText = 'سجل الحضور';
    personHistoryList.appendChild(attendanceHeader);

    const attendance = Array.isArray(person.attendance) ? [...person.attendance] : [];
    if (attendance.length === 0) {
        const p = document.createElement('p');
        p.className = 'text-center text-gray-500 mb-4';
        p.innerText = 'لا يوجد تاريخ حضور لهذا الشخص.';
        personHistoryList.appendChild(p);
    } else {
        attendance.sort((a, b) => new Date(b.date) - new Date(a.date));
        attendance.forEach(session => {
            const listItem = document.createElement('li');
            const isPresent = session.status === true || session.status === 'present';
            const isExcused = session.excused === true || session.status === 'excused';

            let itemClass = 'absent';
            let statusText = 'غائب بدون عذر';
            let iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`;

            if (isPresent) {
                itemClass = 'present';
                statusText = 'حاضر 🟢';
                iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-8.08"/><path d="m9.24 11.24 3.2 3.2 7-7"/></svg>`;
            } else if (isExcused) {
                itemClass = 'excused';
                statusText = session.excuseReason ? `معتذر 🟡 (${session.excuseReason})` : 'غياب باعتذار 🟡';
                iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
            }

            listItem.className = `flex justify-between items-center p-3 rounded-xl shadow-sm ${itemClass} border border-gray-200 dark:border-gray-700 bg-white/5`;
            const date = new Date(session.date).toLocaleDateString(dateLocale(), {
                day: 'numeric', month: 'long', year: 'numeric'
            });

            const hasOverload = session.dayName && session.dayName.includes('Overload');
            const isEventSession = session.eventId || (session.dayName && session.dayName.includes('المرة رقم'));
            
            let badgeHtml = '';
            if (hasOverload) {
                badgeHtml = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-sm mr-1">⚡ Overload</span>';
            } else if (isEventSession) {
                badgeHtml = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white shadow-sm mr-1">🎪 حدث</span>';
            }

            const rawDayName = session.dayName || '';
            const displayName = rawDayName ? `${escapeHTML(transliterateArabic(rawDayName))} (${date})` : date;

            listItem.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="font-bold">${iconSvg}</span>
                    <span class="text-sm font-semibold">${displayName}</span>
                    ${badgeHtml}
                </div>
                <span class="font-bold text-xs ${isPresent ? 'text-emerald-600' : (isExcused ? 'text-amber-500' : 'text-red-500')}">${statusText}</span>
            `;
            personHistoryList.appendChild(listItem);
        });
    }

    // Tasks History Header
    const tasksHeader = document.createElement('h3');
    tasksHeader.className = 'text-xl font-bold mt-6 mb-2 text-yellow-800 dark:text-yellow-300 border-t pt-4';
    tasksHeader.innerText = 'المهام';
    personHistoryList.appendChild(tasksHeader);

    const personTasks = cachedTasks.filter(t => t.personId === personId);
    currentPersonTasks = personTasks;

    if (personTasks.length === 0) {
        const p = document.createElement('p');
        p.className = 'text-center text-gray-500';
        p.innerText = 'لم يتم تعيين أي مهام لهذا الشخص.';
        personHistoryList.appendChild(p);
    } else {
        personTasks.sort((a, b) => new Date(b.date) - new Date(a.date));
        personTasks.forEach(task => {
            const listItem = document.createElement('li');
            const today = new Date().toISOString().slice(0, 10);
            const isFutureTask = task.date >= today;

            let statusClass, statusText, iconSvg;
            if (task.status === 'completed') {
                statusClass = 'task-completed';
                statusText = 'منجزة';
                iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-8.08"/><path d="m9.24 11.24 3.2 3.2 7-7"/></svg>`;
            } else if (task.status === 'in-progress') {
                statusClass = 'task-in-progress';
                statusText = 'قيد التنفيذ';
                iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`;
            } else if (task.status === 'not-completed') {
                statusClass = 'task-not-completed';
                statusText = 'لم يتم إنجازها';
                iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`;
            } else {
                statusClass = 'task-pending';
                statusText = isFutureTask ? 'قيد الانتظار' : 'لم يتم إنجازها';
                iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`;
            }

            listItem.className = `flex justify-between items-center p-3 rounded-lg shadow-sm ${statusClass}`;
            const date = new Date(task.date).toLocaleDateString(dateLocale(), {
                day: 'numeric', month: 'long', year: 'numeric'
            });

            const canPerformActions = canEdit();

            listItem.innerHTML = `
                <div class="flex flex-col items-start gap-1">
                    <span class="font-bold">${escapeHTML(transliterateArabic(task.description))}</span>
                    <span class="text-xs text-gray-600 dark:text-gray-400">تاريخ الاستحقاق: ${date}</span>
                </div>
                <div class="flex items-center gap-2">
                    ${canPerformActions && isFutureTask && task.status !== 'completed' && task.status !== 'not-completed' ? `
                        <div class="task-status-circles">
                            <div class="status-circle in-progress ${task.status === 'in-progress' ? 'active' : ''}" data-task-id="${escapeHTML(task.id)}" data-status="in-progress" title="قيد التنفيذ"></div>
                            <div class="status-circle completed ${task.status === 'completed' ? 'active' : ''}" data-task-id="${escapeHTML(task.id)}" data-status="completed" title="منجزة"></div>
                            <div class="status-circle pending ${task.status === 'pending' ? 'active' : ''}" data-task-id="${escapeHTML(task.id)}" data-status="not-completed" title="لم تنجز"></div>
                        </div>
                    ` : ''}
                    <span>${iconSvg}</span>
                    <span class="font-semibold">${statusText}</span>
                </div>
            `;
            personHistoryList.appendChild(listItem);
        });

        personHistoryList.querySelectorAll('.status-circle').forEach(circle => {
            circle.addEventListener('click', async (e) => {
                if (!canEdit()) {
                    showCustomAlert('تنبيه', 'يجب تسجيل الدخول بصلاحية خادم أو مسؤول لتحديث حالة المهمة.');
                    return;
                }
                const taskId = e.target.dataset.taskId;
                const newStatus = e.target.dataset.status;

                try {
                    if (isUsingFirestore) {
                        await updateDoc(doc(db, 'tasks', taskId), {
                            status: newStatus,
                            updatedAt: new Date().toISOString()
                        });
                    } else {
                        await fetch(`${API_URL}/tasks/${taskId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: newStatus })
                        });
                        const t = cachedTasks.find(x => x.id === taskId);
                        if (t) t.status = newStatus;
                    }
                    showPersonHistory(personId);
                    renderCardsFromCache();
                    renderTasksListFromCache();
                } catch (error) {
                    handleFirestoreError(error, 'update', `tasks/${taskId}`);
                    await showCustomAlert('خطأ', 'فشل في تحديث حالة المهمة.');
                }
            });
        });
    }

    personHistoryModal.style.display = 'flex';
}

function showDayDetails(date) {
    const formattedDate = new Date(date).toLocaleDateString(dateLocale(), {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    let foundDayName = '';
    const dayAttendance = [];

    cachedPeople.forEach(person => {
        const session = (person.attendance || []).find(s => s.date === date);
        if (session) {
            if (session.dayName && !foundDayName) foundDayName = session.dayName;
            const isPresent = session.status === true || session.status === 'present';
            const isExcused = session.excused === true || session.status === 'excused';
            dayAttendance.push({
                name: person.name,
                isPresent,
                isExcused,
                excuseReason: session.excuseReason || ''
            });
        }
    });

    const presentCount = dayAttendance.filter(p => p.isPresent).length;
    const excusedCount = dayAttendance.filter(p => p.isExcused).length;
    const absentCount = dayAttendance.filter(p => !p.isPresent && !p.isExcused).length;

    if (dayDetailsPresentCount) dayDetailsPresentCount.innerText = presentCount;
    if (dayDetailsExcusedCount) dayDetailsExcusedCount.innerText = excusedCount;
    if (dayDetailsAbsentCount) dayDetailsAbsentCount.innerText = absentCount;

    dayDetailsTitle.innerHTML = `${currentLanguage === 'en' ? 'Attendance details:' : 'تفاصيل حضور:'} ${escapeHTML(transliterateArabic(foundDayName || formattedDate))}`;
    dayDetailsList.innerHTML = '';

    if (dayAttendance.length === 0) {
        dayDetailsList.innerHTML = '<p class="text-center text-gray-500 py-4">لا توجد بيانات حضور لهذا اليوم.</p>';
    } else {
        dayAttendance.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
        dayAttendance.forEach(person => {
            const listItem = document.createElement('li');
            let itemClass = 'absent';
            let statusText = 'غائب بدون عذر';
            let iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`;

            if (person.isPresent) {
                itemClass = 'present';
                statusText = 'حاضر 🟢';
                iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-8.08"/><path d="m9.24 11.24 3.2 3.2 7-7"/></svg>`;
            } else if (person.isExcused) {
                itemClass = 'excused';
                statusText = person.excuseReason ? `معتذر 🟡 (${person.excuseReason})` : 'معتذر 🟡';
                iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`;
            }

            listItem.className = `flex justify-between items-center p-3 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white/5`;

            listItem.innerHTML = `
                <div class="flex items-center gap-3">
                    <span>${iconSvg}</span>
                    <span class="font-bold text-sm text-gray-800 dark:text-gray-100">${escapeHTML(transliterateArabic(person.name))}</span>
                </div>
                <span class="font-bold text-xs ${person.isPresent ? 'text-emerald-600' : (person.isExcused ? 'text-amber-500' : 'text-red-500')}">${statusText}</span>
            `;
            dayDetailsList.appendChild(listItem);
        });
    }

    dayDetailsModal.style.display = 'flex';
}

async function updateDay() {
    if (!canEdit() || !currentEditingDay) return;

    const newDayName = editDayNameInput.value.trim();
    const newDate = editDateInput.value;
    const originalDate = currentEditingDay.date;

    if (!newDate) {
        await showCustomAlert('خطأ', 'التاريخ لا يمكن أن يكون فارغاً.');
        return;
    }

    const statusUpdates = {};
    const rows = editDayAddList.querySelectorAll('.edit-day-person-row');
    rows.forEach(row => {
        const pId = row.dataset.personId;
        const checkedRadio = row.querySelector(`input[name="edit_status_${pId}"]:checked`);
        const status = checkedRadio ? checkedRadio.value : 'absent';
        const excuseSelect = row.querySelector('.edit-excuse-select');
        const excuseReason = (status === 'excused' && excuseSelect) ? excuseSelect.value : '';

        statusUpdates[pId] = {
            status: status === 'present' ? 'present' : (status === 'excused' ? 'excused' : 'absent'),
            excused: status === 'excused',
            excuseReason: status === 'excused' ? (excuseReason || 'عذر مقبول') : ''
        };
    });

    try {
        if (isUsingFirestore) {
            let batch = writeBatch(db);
            cachedPeople.forEach(person => {
                const update = statusUpdates[person.id];
                let attendance = Array.isArray(person.attendance) ? [...person.attendance] : [];
                
                // 1. Rename date/dayName if changed
                attendance = attendance.map(session => {
                    if (session.date === originalDate) {
                        return {
                            ...session,
                            date: newDate,
                            dayName: newDayName || session.dayName || ''
                        };
                    }
                    return session;
                });

                // 2. Apply status update if specified
                if (update) {
                    const isPresent = update.status === 'present';
                    const isExcused = update.status === 'excused';
                    const sIdx = attendance.findIndex(s => s.date === newDate);
                    const record = {
                        date: newDate,
                        status: isPresent,
                        excused: isExcused,
                        excuseReason: isExcused ? (update.excuseReason || 'عذر مقبول') : '',
                        dayName: newDayName || ''
                    };

                    if (sIdx !== -1) {
                        attendance[sIdx] = { ...attendance[sIdx], ...record };
                    } else {
                        attendance.push(record);
                    }
                }

                batch.update(doc(db, 'people', person.id), {
                    attendance,
                    updatedAt: new Date().toISOString()
                });
            });
            await batch.commit();
        } else {
            await fetch(`${API_URL}/days/${originalDate}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newDate, newDayName, statusUpdates })
            });

            cachedPeople.forEach(person => {
                const update = statusUpdates[person.id];
                person.attendance = person.attendance || [];
                
                // Rename date
                person.attendance.forEach(session => {
                    if (session.date === originalDate) {
                        session.date = newDate;
                        session.dayName = newDayName || session.dayName || '';
                    }
                });

                if (update) {
                    const isPresent = update.status === 'present';
                    const isExcused = update.status === 'excused';
                    const s = person.attendance.find(x => x.date === newDate);
                    if (s) {
                        s.status = isPresent;
                        s.excused = isExcused;
                        s.excuseReason = isExcused ? (update.excuseReason || 'عذر مقبول') : '';
                        s.dayName = newDayName || s.dayName;
                    } else {
                        person.attendance.push({
                            date: newDate,
                            status: isPresent,
                            excused: isExcused,
                            excuseReason: isExcused ? (update.excuseReason || 'عذر مقبول') : '',
                            dayName: newDayName
                        });
                    }
                }
            });
            renderCardsFromCache();
            renderDaysListFromCache();
        }

        editDayModal.style.display = 'none';
        await showCustomAlert('نجاح', 'تم تحديث بيانات اليوم والغياب والاعتذارات بنجاح! 🎉');
    } catch (error) {
        handleFirestoreError(error, 'update', 'people/days');
        await showCustomAlert('خطأ', 'فشل في تحديث اليوم.');
    }
}

async function deleteDay(date) {
    if (!canEdit()) {
        await showCustomAlert('تنبيه', 'يجب تسجيل الدخول بحساب خادم أو مسؤول لحذف الأيام.');
        return;
    }

    try {
        if (isUsingFirestore) {
            let batch = writeBatch(db);
            cachedPeople.forEach(person => {
                const updatedAttendance = (person.attendance || []).filter(s => s.date !== date);
                if (updatedAttendance.length !== (person.attendance || []).length) {
                    batch.update(doc(db, 'people', person.id), {
                        attendance: updatedAttendance,
                        updatedAt: new Date().toISOString()
                    });
                }
            });
            await batch.commit();
        } else {
            await fetch(`${API_URL}/days/${date}`, { method: 'DELETE' });
            cachedPeople.forEach(person => {
                person.attendance = (person.attendance || []).filter(s => s.date !== date);
            });
            renderCardsFromCache();
            renderDaysListFromCache();
        }

        await showCustomAlert('نجاح', 'تم حذف اليوم بنجاح.');
    } catch (error) {
        handleFirestoreError(error, 'delete', `people/days/${date}`);
        await showCustomAlert('خطأ', 'فشل في حذف اليوم.');
    }
}

// --- DATA MIGRATION FROM SERVER TO FIRESTORE ---
async function syncDataToFirestore() {
    if (!canEdit()) {
        await showCustomAlert('تنبيه', 'يجب تسجيل الدخول بصلاحية خادم أو مسؤول لمزامنة البيانات.');
        return;
    }

    const confirmed = await showCustomConfirm('هل تريد نقل ومزامنة جميع البيانات من السيرفر المحلي (data.json) إلى Cloud Firestore؟ سيتم الحفاظ على كافة السجلات التاريخية.');
    if (!confirmed) return;

    try {
        const pRes = await fetch(`${API_URL}/people`);
        const { people } = await pRes.json();
        const tRes = await fetch(`${API_URL}/tasks`);
        const tasks = await tRes.json();
        const eRes = await fetch(`${API_URL}/events`);
        const events = await eRes.json();

        let batch = writeBatch(db);
        let count = 0;

        for (const p of people) {
            const pRef = doc(db, 'people', p.id);
            batch.set(pRef, {
                id: p.id,
                name: p.name,
                attendance: p.attendance || [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }, { merge: true });
            count++;
            if (count % 400 === 0) {
                await batch.commit();
                batch = writeBatch(db);
            }
        }

        for (const t of tasks) {
            const tRef = doc(db, 'tasks', t.id);
            batch.set(tRef, {
                id: t.id,
                batchId: t.batchId || '',
                description: t.description,
                personId: t.personId,
                date: t.date,
                status: t.status || 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }, { merge: true });
            count++;
            if (count % 400 === 0) {
                await batch.commit();
                batch = writeBatch(db);
            }
        }

        if (Array.isArray(events)) {
            for (const ev of events) {
                const eRef = doc(db, 'events', ev.id);
                batch.set(eRef, {
                    id: ev.id,
                    name: ev.name,
                    description: ev.description || '',
                    startDate: ev.startDate,
                    endDate: ev.endDate || '',
                    targetCount: ev.targetCount || 2,
                    sessions: ev.sessions || [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }, { merge: true });
                count++;
                if (count % 400 === 0) {
                    await batch.commit();
                    batch = writeBatch(db);
                }
            }
        }

        await batch.commit();
        await showCustomAlert('تمت المزامنة بنجاح 🎉', `تم نقل ${people.length} شخص و ${tasks.length} مهمة بنجاح إلى قاعدة بيانات Firestore السحابية!`);
        syncDataBtn.classList.add('hidden');
    } catch (err) {
        console.error('Migration error:', err);
        await showCustomAlert('خطأ', `فشلت المزامنة: ${err.message}`);
    }
}

// Check if Firestore is empty to suggest migration
async function checkIfMigrationNeeded() {
    if (!canEdit()) return;
    try {
        const snap = await getDocs(collection(db, 'people'));
        if (snap.empty) {
            syncDataBtn.classList.remove('hidden');
        } else {
            syncDataBtn.classList.add('hidden');
        }
    } catch (e) {
        console.warn('Could not check Firestore collection size', e);
    }
}

// --- FALLBACK FETCH FROM SERVER API ---
async function fetchPeopleFallback() {
    try {
        const res = await fetch(`${API_URL}/people`);
        if (res.ok) {
            const data = await res.json();
            cachedPeople = data.people || [];
            renderCardsFromCache();
            renderDaysListFromCache();
        }
    } catch (e) {
        console.error('Fallback fetch error for people:', e);
    }
}

async function fetchTasksFallback() {
    try {
        const res = await fetch(`${API_URL}/tasks`);
        if (res.ok) {
            const tasks = await res.json();
            cachedTasks = tasks || [];
            renderTasksListFromCache();
        }
    } catch (e) {
        console.error('Fallback fetch error for tasks:', e);
    }
}

async function fetchEventsFallback() {
    try {
        const res = await fetch(`${API_URL}/events`);
        if (res.ok) {
            const events = await res.json();
            cachedEvents = events || [];
            renderEvents();
        }
    } catch (e) {
        console.error('Fallback fetch error for events:', e);
    }
}

// --- SETUP REALTIME FIRESTORE LISTENERS ---
function setupRealtimeListeners() {
    isUsingFirestore = true;

    // People listener
    onSnapshot(collection(db, 'people'), (snapshot) => {
        const list = [];
        snapshot.forEach(docSnap => {
            list.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (list.length > 0 || isUsingFirestore) {
            cachedPeople = list;
            renderCardsFromCache();
            renderDaysListFromCache();
            renderEvents();
        }
    }, (error) => {
        console.warn('Firestore people onSnapshot error, falling back to local server API:', error);
        fetchPeopleFallback();
    });

    // Tasks listener
    onSnapshot(collection(db, 'tasks'), (snapshot) => {
        const list = [];
        snapshot.forEach(docSnap => {
            list.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (list.length > 0 || isUsingFirestore) {
            cachedTasks = list;
            renderTasksListFromCache();
            renderCardsFromCache();
        }
    }, (error) => {
        console.warn('Firestore tasks onSnapshot error, falling back to local server API:', error);
        fetchTasksFallback();
    });

    // Events listener
    onSnapshot(collection(db, 'events'), (snapshot) => {
        const list = [];
        snapshot.forEach(docSnap => {
            list.push({ id: docSnap.id, ...docSnap.data() });
        });
        cachedEvents = list;
        renderEvents();
        renderCardsFromCache();
    }, (error) => {
        console.warn('Firestore events onSnapshot error, falling back to local server API:', error);
        fetchEventsFallback();
    });
}

// Update UI based on permissions
function updateUIForRole() {
    renderCardsFromCache();
    renderDaysListFromCache();
    renderTasksListFromCache();
    renderEvents();

    if (!canEdit()) {
        addPersonBtn.classList.add('opacity-75');
        quickAddBtn.classList.add('opacity-75');
        addTaskBtn.classList.add('opacity-75');
        openAddEventModalBtn.classList.add('opacity-75');
        addEventQuickBtn.classList.add('opacity-75');
    } else {
        addPersonBtn.classList.remove('opacity-75');
        quickAddBtn.classList.remove('opacity-75');
        addTaskBtn.classList.remove('opacity-75');
        openAddEventModalBtn.classList.remove('opacity-75');
        addEventQuickBtn.classList.remove('opacity-75');
    }
}

// Theme handling
function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcons(isDark);
}

function updateThemeIcons(isDark) {
    if (isDark) {
        sunIcon.classList.remove('hidden'); 
        moonIcon.classList.add('hidden');
    } else {
        sunIcon.classList.add('hidden'); 
        moonIcon.classList.remove('hidden');
    }
}

function initializeTheme() {
    const storedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = (storedTheme === 'dark' || (!storedTheme && prefersDark));
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    updateThemeIcons(isDark);
}

// ========================================================
// --- REPORTS & EXPORT ENGINE (CSV / PDF / PRINT) ---
// ========================================================

function escapeCSV(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
}

function getReportDataset(scope, specificEventId, specificPersonId) {
    const allDays = deriveDaysList(cachedPeople);
    let peopleToInclude = [...cachedPeople];
    let eventsToInclude = [...cachedEvents];

    if (scope === 'specific-person' && specificPersonId) {
        peopleToInclude = cachedPeople.filter(p => p.id === specificPersonId);
    }

    if (scope === 'specific-event' && specificEventId) {
        eventsToInclude = cachedEvents.filter(e => e.id === specificEventId);
    }

    // Process People metrics
    const peopleData = peopleToInclude.map(person => {
        const attendance = Array.isArray(person.attendance) ? person.attendance : [];
        const attendedDays = attendance.filter(s => s.status === true || s.status === 'present').length;
        const excusedDays = attendance.filter(s => s.excused === true || s.status === 'excused').length;
        const unexcusedDays = attendance.filter(s => !s.status && !s.excused && s.status !== 'excused' && s.status !== 'present').length;
        const totalDays = attendance.length;

        // Commitment rate according to user rule:
        // e.g. 6 meetings, 4 attended, 2 excused => (6 - 2) = 4 required => 4/4 = 100%!
        const requiredDays = totalDays - excusedDays;
        let commitmentRate = 0;
        if (requiredDays > 0) {
            commitmentRate = Math.min(100, Math.round((attendedDays / requiredDays) * 100));
        } else if (totalDays > 0 && (attendedDays > 0 || excusedDays === totalDays)) {
            commitmentRate = 100;
        }

        const attendanceRate = totalDays > 0 ? Math.round((attendedDays / totalDays) * 100) : 0;

        // Event Attendance & Overload Breakdown
        let totalEventSessions = 0;
        let totalOverload = 0;
        const eventsBreakdown = cachedEvents.map(event => {
            const count = getPersonEventAttendanceCount(person.id, event.id);
            const target = event.targetCount || 2;
            const regular = Math.min(count, target);
            const overload = Math.max(0, count - target);
            if (count > 0) totalEventSessions += count;
            totalOverload += overload;

            // Sessions matching this event
            const eventSessions = attendance.filter(s => {
                if (!s.status) return false;
                if (s.eventId === event.id) return true;
                if (s.dayName && s.dayName.includes(event.name)) return true;
                return false;
            });

            return {
                eventId: event.id,
                eventName: event.name,
                target,
                count,
                regular,
                overload,
                isCompleted: count >= target,
                sessions: eventSessions
            };
        });

        // Tasks
        const personTasks = cachedTasks.filter(t => t.personId === person.id);
        const completedTasks = personTasks.filter(t => t.status === 'completed').length;
        const taskRate = personTasks.length > 0 ? Math.round((completedTasks / personTasks.length) * 100) : 0;

        // Commitment Tier Evaluation
        let tier = 'يحتاج متابعة ⚠️';
        let tierColor = '#ef4444';
        if (commitmentRate === 100 && (attendedDays > 0 || totalDays > 0)) {
            if (excusedDays > 0) {
                tier = 'ممتاز 🌟 (التزام كامل بالاعتذار)';
                tierColor = '#10b981';
            } else {
                tier = 'مثالي 👑 (التزام كامل 100%)';
                tierColor = '#059669';
            }
        } else if (commitmentRate >= 75) {
            tier = 'منتظم ✅';
            tierColor = '#3b82f6';
        } else if (unexcusedDays >= 2) {
            tier = 'غياب غير مبرر 🚨';
            tierColor = '#dc2626';
        } else if (attendedDays === 0 && totalDays > 0) {
            tier = 'غائب ❌';
            tierColor = '#9ca3af';
        }

        return {
            id: person.id,
            name: person.name,
            attendance,
            attendedDays,
            excusedDays,
            unexcusedDays,
            requiredDays,
            commitmentRate,
            totalDays,
            absentDays: totalDays - attendedDays,
            attendanceRate,
            totalEventSessions,
            totalOverload,
            eventsBreakdown,
            personTasks,
            completedTasks,
            taskRate,
            tier,
            tierColor
        };
    });

    // Process Events metrics
    const eventsData = eventsToInclude.map(event => {
        const target = event.targetCount || 2;
        let attendeesCount = 0;
        let completedTargetCount = 0;
        let totalOverloads = 0;
        const attendeesList = [];

        cachedPeople.forEach(person => {
            const count = getPersonEventAttendanceCount(person.id, event.id);
            if (count > 0) {
                attendeesCount++;
                if (count >= target) completedTargetCount++;
                const overload = Math.max(0, count - target);
                totalOverloads += overload;

                const personSessions = (person.attendance || []).filter(s => {
                    if (!s.status) return false;
                    if (s.eventId === event.id) return true;
                    if (s.dayName && s.dayName.includes(event.name)) return true;
                    return false;
                });

                attendeesList.push({
                    personId: person.id,
                    personName: person.name,
                    count,
                    regularCount: Math.min(count, target),
                    overloadCount: overload,
                    isCompleted: count >= target,
                    sessions: personSessions
                });
            }
        });

        // Sort attendees by count descending
        attendeesList.sort((a, b) => b.count - a.count);

        return {
            id: event.id,
            name: event.name,
            description: event.description || '',
            startDate: event.startDate,
            endDate: event.endDate || '',
            targetCount: target,
            sessionsCount: (event.sessions || []).length,
            attendeesCount,
            completedTargetCount,
            totalOverloads,
            attendeesList
        };
    });

    // Global KPIs
    const totalPeople = cachedPeople.length;
    const avgAttendanceRate = peopleData.length > 0 
        ? Math.round(peopleData.reduce((acc, p) => acc + p.attendanceRate, 0) / peopleData.length) 
        : 0;
    const totalOverloadSum = peopleData.reduce((acc, p) => acc + p.totalOverload, 0);
    const totalCompletedTasks = cachedTasks.filter(t => t.status === 'completed').length;

    return {
        peopleData,
        eventsData,
        allDays,
        globalKPIs: {
            totalPeople,
            totalRecordedDays: allDays.length,
            avgAttendanceRate,
            totalEvents: cachedEvents.length,
            totalOverloadSum,
            totalTasks: cachedTasks.length,
            totalCompletedTasks
        }
    };
}

function generateReportHTML(scope, version, specificEventId, specificPersonId) {
    const dataset = getReportDataset(scope, specificEventId, specificPersonId);
    const { peopleData, eventsData, globalKPIs } = dataset;

    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const currentDateStr = new Date().toLocaleDateString('ar-EG', dateOptions);
    const currentTimeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const adminName = currentUser ? (currentUser.displayName || currentUser.email) : 'مسؤول النظام';

    let scopeLabel = 'تقرير شامل موحد';
    if (scope === 'events') scopeLabel = 'تقرير الأحداث والمواسم وتتبع الـ Overload ⚡';
    if (scope === 'attendance') scopeLabel = 'تقرير الحضور العام للأيام';
    if (scope === 'specific-event') {
        const ev = cachedEvents.find(e => e.id === specificEventId);
        scopeLabel = ev ? `تقرير حدث: "${escapeHTML(ev.name)}"` : 'تقرير حدث محدد';
    }
    if (scope === 'specific-person') {
        const p = cachedPeople.find(x => x.id === specificPersonId);
        scopeLabel = p ? `تقرير متابعة: "${escapeHTML(p.name)}"` : 'تقرير شخص محدد';
    }

    const isSummary = version === 'summary';
    const versionLabel = isSummary ? 'نسخة ملخصة للمسؤولين (Executive Summary)' : 'نسخة تفصيلية شاملة (Full Detailed Audit)';

    let html = `
    <div style="font-family: 'Cairo', Tahoma, sans-serif; direction: rtl; text-align: right; color: #111827; background: #ffffff; padding: 20px; line-height: 1.5;">
        
        <!-- Header Banner -->
        <div style="border-bottom: 3px double #d1a85c; padding-bottom: 16px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div style="text-align: right;">
                    <h1 style="font-size: 20px; font-weight: 800; color: #78350f; margin: 0 0 4px 0;">أسرة الانبا ارسانيوس والقديس نيقولاوس لوسائل الايضاح</h1>
                    <h2 style="font-size: 15px; font-weight: 700; color: #92400e; margin: 0 0 4px 0;">${escapeHTML(scopeLabel)}</h2>
                    <span style="display: inline-block; font-size: 12px; font-weight: 700; background: ${isSummary ? '#dbeafe' : '#fef3c7'}; color: ${isSummary ? '#1e40af' : '#92400e'}; padding: 3px 10px; border-radius: 9999px; border: 1px solid ${isSummary ? '#93c5fd' : '#fcd34d'};">
                        ${versionLabel}
                    </span>
                </div>
                <div style="text-align: left; font-size: 11px; color: #4b5563; font-family: monospace;">
                    <div>📅 التاريخ: <strong>${currentDateStr}</strong></div>
                    <div>⏰ الوقت: <strong>${currentTimeStr}</strong></div>
                    <div>👤 المستخرج: <strong>${escapeHTML(adminName)}</strong></div>
                    <div style="color: #059669; font-weight: bold;">✓ نظام المتابعة السحابي المعتمد</div>
                </div>
            </div>
        </div>

        <!-- Executive KPI Cards -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;" class="avoid-break">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; text-align: center;">
                <span style="font-size: 11px; color: #64748b; display: block;">إجمالي الخدام / الأشخاص</span>
                <span style="font-size: 20px; font-weight: 800; color: #1e293b;">${globalKPIs.totalPeople}</span>
            </div>
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px; text-align: center;">
                <span style="font-size: 11px; color: #047857; display: block;">متوسط نسبة الالتزام</span>
                <span style="font-size: 20px; font-weight: 800; color: #059669;">${globalKPIs.avgAttendanceRate}%</span>
            </div>
            <div style="background: #fefce8; border: 1px solid #fde047; border-radius: 10px; padding: 12px; text-align: center;">
                <span style="font-size: 11px; color: #854d0e; display: block;">إجمالي الـ Overload ⚡</span>
                <span style="font-size: 20px; font-weight: 800; color: #d97706;">+${globalKPIs.totalOverloadSum} نزول</span>
            </div>
            <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 10px; padding: 12px; text-align: center;">
                <span style="font-size: 11px; color: #6b21a8; display: block;">المهام المنجزة</span>
                <span style="font-size: 20px; font-weight: 800; color: #7e22ce;">${globalKPIs.totalCompletedTasks} / ${globalKPIs.totalTasks}</span>
            </div>
        </div>
    `;

    // SECTION 1: PEOPLE SUMMARY TABLE (Included in both Summary and Detailed)
    if (scope !== 'specific-event') {
        html += `
        <div style="margin-bottom: 24px;" class="avoid-break">
            <h3 style="font-size: 14px; font-weight: 800; color: #1f2937; margin: 0 0 10px 0; border-right: 4px solid #b45309; padding-right: 8px;">
                👥 ${isSummary ? 'جدول المتابعة والالتزام الملخص للخدام والأشخاص' : 'موجز مؤشرات الخدام والأشخاص'}
            </h3>
            <table class="report-table" style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: right;">
                <thead>
                    <tr style="background-color: #f1f5f9; color: #334155;">
                        <th style="padding: 8px; border: 1px solid #cbd5e1; width: 35px; text-align: center;">م</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1;">الاسم</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">حضور 🟢</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">بعذر 🟡</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">بدون عذر 🔴</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">الالتزام بالعذر 🎯</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">حضور مباشر</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">حضور الأحداث</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">Overload ⚡</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">المهام</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">التقييم</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (peopleData.length === 0) {
            html += `<tr><td colspan="11" style="padding: 16px; text-align: center; color: #64748b; border: 1px solid #cbd5e1;">لا توجد بيانات متاحة للعرض.</td></tr>`;
        } else {
            peopleData.forEach((p, idx) => {
                const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
                html += `
                    <tr style="background-color: ${rowBg};">
                        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${idx + 1}</td>
                        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 700; color: #0f172a;">${escapeHTML(p.name)}</td>
                        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #059669;">${p.attendedDays}</td>
                        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #d97706;">${p.excusedDays}</td>
                        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: ${p.unexcusedDays > 0 ? '#dc2626' : '#64748b'};">${p.unexcusedDays}</td>
                        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: ${p.commitmentRate >= 75 ? '#059669' : (p.commitmentRate >= 50 ? '#d97706' : '#dc2626')};">
                            ${p.commitmentRate}%
                        </td>
                        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; color: #64748b;">
                            ${p.attendanceRate}%
                        </td>
                        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #2563eb;">${p.totalEventSessions} نزول</td>
                        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: ${p.totalOverload > 0 ? '#d97706' : '#64748b'};">
                            ${p.totalOverload > 0 ? `+${p.totalOverload} ⚡` : '-'}
                        </td>
                        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${p.completedTasks}/${p.personTasks.length}</td>
                        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: ${p.tierColor};">
                            ${p.tier}
                        </td>
                    </tr>
                `;
            });
        }

        html += `
                </tbody>
            </table>
        </div>
        `;
    }

    // SECTION 2: EVENTS SUMMARY TABLE (Included in both Summary and Detailed)
    if (scope !== 'specific-person' && scope !== 'attendance') {
        html += `
        <div style="margin-bottom: 24px;" class="avoid-break">
            <h3 style="font-size: 14px; font-weight: 800; color: #1f2937; margin: 0 0 10px 0; border-right: 4px solid #7c3aed; padding-right: 8px;">
                🎪 ${isSummary ? 'جدول ملخص الأحداث والمواسم وتتبع الـ Overload ⚡' : 'موجز الأحداث والمواسم'}
            </h3>
            <table class="report-table" style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: right;">
                <thead>
                    <tr style="background-color: #f5f3ff; color: #5b21b6;">
                        <th style="padding: 8px; border: 1px solid #ddd6fe; width: 35px; text-align: center;">م</th>
                        <th style="padding: 8px; border: 1px solid #ddd6fe;">اسم الحدث / الموسم</th>
                        <th style="padding: 8px; border: 1px solid #ddd6fe; text-align: center;">الفترة</th>
                        <th style="padding: 8px; border: 1px solid #ddd6fe; text-align: center;">الحد المطلوب</th>
                        <th style="padding: 8px; border: 1px solid #ddd6fe; text-align: center;">الحاضرون</th>
                        <th style="padding: 8px; border: 1px solid #ddd6fe; text-align: center;">أكملوا المطلوب (100%)</th>
                        <th style="padding: 8px; border: 1px solid #ddd6fe; text-align: center;">Overload ⚡ الإضافي</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (eventsData.length === 0) {
            html += `<tr><td colspan="7" style="padding: 16px; text-align: center; color: #64748b; border: 1px solid #ddd6fe;">لا توجد أحداث مسجلة.</td></tr>`;
        } else {
            eventsData.forEach((ev, idx) => {
                const rowBg = idx % 2 === 0 ? '#ffffff' : '#faf5ff';
                const dateSpan = `${ev.startDate} ${ev.endDate ? `إلى ${ev.endDate}` : ''}`;
                html += `
                    <tr style="background-color: ${rowBg};">
                        <td style="padding: 6px 8px; border: 1px solid #ddd6fe; text-align: center; font-weight: bold;">${idx + 1}</td>
                        <td style="padding: 6px 8px; border: 1px solid #ddd6fe; font-weight: 700; color: #4c1d95;">
                            ${escapeHTML(ev.name)}
                            ${ev.description ? `<span style="font-size: 10px; color: #6b7280; display: block; font-weight: normal;">${escapeHTML(ev.description)}</span>` : ''}
                        </td>
                        <td style="padding: 6px 8px; border: 1px solid #ddd6fe; text-align: center; font-size: 10px; color: #4b5563;">${dateSpan}</td>
                        <td style="padding: 6px 8px; border: 1px solid #ddd6fe; text-align: center; font-weight: bold;">${ev.targetCount} مرات</td>
                        <td style="padding: 6px 8px; border: 1px solid #ddd6fe; text-align: center; font-weight: bold; color: #2563eb;">${ev.attendeesCount} شخص</td>
                        <td style="padding: 6px 8px; border: 1px solid #ddd6fe; text-align: center; font-weight: bold; color: #059669;">${ev.completedTargetCount}</td>
                        <td style="padding: 6px 8px; border: 1px solid #ddd6fe; text-align: center; font-weight: bold; color: #d97706;">
                            ${ev.totalOverloads > 0 ? `+${ev.totalOverloads} ⚡` : '0'}
                        </td>
                    </tr>
                `;
            });
        }

        html += `
                </tbody>
            </table>
        </div>
        `;
    }

    // SECTION 3: DETAILED AUDIT SECTIONS (Only if version === 'detailed')
    if (!isSummary) {
        html += `
        <!-- Detailed Person-by-Person Attendance and Session Logs -->
        <div style="margin-top: 30px; margin-bottom: 24px;" class="page-break">
            <h3 style="font-size: 16px; font-weight: 800; color: #1e3a8a; margin: 0 0 16px 0; border-right: 5px solid #2563eb; padding-right: 10px;">
                📑 السجل الزمني والتفصيلي للخدام والأشخاص (تواريخ الجلسات، أرقام المرات، حالات Overload ⚡، والمهام)
            </h3>
        `;

        peopleData.forEach(p => {
            html += `
            <div style="border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin-bottom: 18px; background: #fafafa;" class="avoid-break">
                <!-- Person Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 10px;">
                    <div>
                        <span style="font-size: 14px; font-weight: 800; color: #0f172a;">👤 ${escapeHTML(p.name)}</span>
                        <span style="font-size: 11px; margin-right: 8px; padding: 2px 8px; border-radius: 6px; font-weight: bold; background: #e0f2fe; color: #0369a1;">
                            الالتزام: ${p.attendanceRate}% (${p.attendedDays} / ${p.totalDays})
                        </span>
                    </div>
                    <div style="font-size: 11px;">
                        <span style="font-weight: bold; color: #b45309; margin-left: 10px;">إجمالي نزول الأحداث: ${p.totalEventSessions}</span>
                        <span style="font-weight: bold; color: #d97706; padding: 2px 8px; border-radius: 6px; background: #fef3c7;">
                            Overload: +${p.totalOverload} ⚡
                        </span>
                    </div>
                </div>

                <!-- Detailed Sessions List -->
                <div style="margin-bottom: 10px;">
                    <span style="font-size: 11px; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">📅 سجل الجلسات والتواريخ المسجلة:</span>
            `;

            if (p.attendance.length === 0) {
                html += `<div style="font-size: 11px; color: #94a3b8; font-style: italic;">لا توجد أي جلسات مسجلة بعد لهذا الشخص.</div>`;
            } else {
                html += `
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 6px;">
                `;
                p.attendance.forEach(s => {
                    const isAttended = s.status === true || s.status === 'present';
                    const isExcused = s.excused === true || s.status === 'excused';
                    const dateFormatted = new Date(s.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
                    const isOverload = s.dayName && s.dayName.includes('Overload');

                    let borderCol = '#86efac';
                    let bgCol = '#f0fdf4';
                    let textCol = '#15803d';
                    let symbol = '✓ ';
                    let label = escapeHTML(s.dayName || 'جلسة عادية');

                    if (isAttended) {
                        if (isOverload) {
                            borderCol = '#fcd34d';
                            bgCol = '#fefce8';
                            textCol = '#b45309';
                            symbol = '⚡ ';
                        }
                    } else if (isExcused) {
                        borderCol = '#fde68a';
                        bgCol = '#fffbeb';
                        textCol = '#b45309';
                        symbol = '🟡 ';
                        label = `${label} (معتذر: ${escapeHTML(s.excuseReason || 'عذر مقبول')})`;
                    } else {
                        borderCol = '#fca5a5';
                        bgCol = '#fef2f2';
                        textCol = '#b91c1c';
                        symbol = '✗ ';
                        label = `${label} (غائب بدون عذر)`;
                    }

                    html += `
                        <div style="font-size: 10.5px; padding: 5px 8px; border-radius: 6px; border: 1px solid ${borderCol}; background: ${bgCol}; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong style="color: ${textCol};">${symbol}</strong>
                                <span>${label}</span>
                            </div>
                            <span style="color: #64748b; font-size: 9.5px; font-family: monospace;">${dateFormatted}</span>
                        </div>
                    `;
                });
                html += `</div>`;
            }

            // Detailed Tasks
            if (p.personTasks.length > 0) {
                html += `
                <div style="margin-top: 10px; border-top: 1px dashed #cbd5e1; pt-2;">
                    <span style="font-size: 11px; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">📝 المهام المسندة:</span>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                `;
                p.personTasks.forEach(task => {
                    const isDone = task.status === 'completed';
                    html += `
                        <span style="font-size: 10px; padding: 3px 8px; border-radius: 4px; border: 1px solid ${isDone ? '#86efac' : '#cbd5e1'}; background: ${isDone ? '#f0fdf4' : '#ffffff'}; color: ${isDone ? '#166534' : '#475569'};">
                            ${isDone ? '✓' : '○'} ${escapeHTML(task.description)} (${task.dueDate}) [${task.status === 'completed' ? 'منجزة' : (task.status === 'in-progress' ? 'قيد التنفيذ' : 'معلقة')}]
                        </span>
                    `;
                });
                html += `</div></div>`;
            }

            html += `</div>`;
        });

        html += `</div>`;

        // Detailed Event Rosters
        html += `
        <div style="margin-top: 24px; margin-bottom: 24px;" class="page-break">
            <h3 style="font-size: 16px; font-weight: 800; color: #6d28d9; margin: 0 0 16px 0; border-right: 5px solid #7c3aed; padding-right: 10px;">
                🎪 كشوفات الحضور التفصيلية لكل حدث والـ Overload ⚡
            </h3>
        `;

        eventsData.forEach(ev => {
            html += `
            <div style="border: 1px solid #ddd6fe; border-radius: 10px; padding: 14px; margin-bottom: 18px; background: #faf5ff;" class="avoid-break">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e9d5ff; padding-bottom: 8px; margin-bottom: 10px;">
                    <div>
                        <span style="font-size: 14px; font-weight: 800; color: #4c1d95;">🎪 ${escapeHTML(ev.name)}</span>
                        <span style="font-size: 11px; margin-right: 8px; color: #6b7280;">(${ev.startDate} ${ev.endDate ? `إلى ${ev.endDate}` : ''})</span>
                    </div>
                    <div style="font-size: 11px;">
                        <span style="font-weight: bold; color: #047857; margin-left: 10px;">الهدف: ${ev.targetCount} نزول</span>
                        <span style="font-weight: bold; color: #2563eb; margin-left: 10px;">الحاضرون: ${ev.attendeesCount}</span>
                        <span style="font-weight: bold; color: #d97706; padding: 2px 8px; border-radius: 6px; background: #fef3c7;">
                            إجمالي Overload: +${ev.totalOverloads} ⚡
                        </span>
                    </div>
                </div>

                <table class="report-table" style="width: 100%; border-collapse: collapse; font-size: 10.5px; text-align: right; background: #ffffff;">
                    <thead>
                        <tr style="background-color: #ede9fe; color: #4c1d95;">
                            <th style="padding: 6px; border: 1px solid #ddd6fe; width: 30px; text-align: center;">م</th>
                            <th style="padding: 6px; border: 1px solid #ddd6fe;">الاسم</th>
                            <th style="padding: 6px; border: 1px solid #ddd6fe; text-align: center;">إجمالي النزول</th>
                            <th style="padding: 6px; border: 1px solid #ddd6fe; text-align: center;">النزول العادي</th>
                            <th style="padding: 6px; border: 1px solid #ddd6fe; text-align: center;">Overload ⚡</th>
                            <th style="padding: 6px; border: 1px solid #ddd6fe;">سجل التواريخ والملاحظات</th>
                            <th style="padding: 6px; border: 1px solid #ddd6fe; text-align: center;">الحالة</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            if (ev.attendeesList.length === 0) {
                html += `<tr><td colspan="7" style="padding: 12px; text-align: center; color: #8b5cf6; border: 1px solid #ddd6fe;">لم يسجل أي حضور في هذا الحدث حتى الآن.</td></tr>`;
            } else {
                ev.attendeesList.forEach((att, idx) => {
                    const datesStr = att.sessions.map((s, sIdx) => {
                        const sNum = sIdx + 1;
                        const isOvr = sNum > ev.targetCount;
                        const d = new Date(s.date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'numeric' });
                        return `<span style="display: inline-block; padding: 1px 4px; margin: 1px; border-radius: 3px; font-size: 9.5px; background: ${isOvr ? '#fef3c7' : '#e0f2fe'}; color: ${isOvr ? '#92400e' : '#0369a1'};">${d} (${isOvr ? `⚡+${sNum - ev.targetCount}` : `#${sNum}`})</span>`;
                    }).join(' ');

                    html += `
                        <tr>
                            <td style="padding: 5px; border: 1px solid #ddd6fe; text-align: center; font-weight: bold;">${idx + 1}</td>
                            <td style="padding: 5px; border: 1px solid #ddd6fe; font-weight: bold; color: #1e1b4b;">${escapeHTML(att.personName)}</td>
                            <td style="padding: 5px; border: 1px solid #ddd6fe; text-align: center; font-weight: bold; color: #2563eb;">${att.count}</td>
                            <td style="padding: 5px; border: 1px solid #ddd6fe; text-align: center;">${att.regularCount} / ${ev.targetCount}</td>
                            <td style="padding: 5px; border: 1px solid #ddd6fe; text-align: center; font-weight: bold; color: ${att.overloadCount > 0 ? '#d97706' : '#9ca3af'};">
                                ${att.overloadCount > 0 ? `+${att.overloadCount} ⚡` : '-'}
                            </td>
                            <td style="padding: 5px; border: 1px solid #ddd6fe;">${datesStr || '-'}</td>
                            <td style="padding: 5px; border: 1px solid #ddd6fe; text-align: center; font-weight: bold; color: ${att.isCompleted ? '#059669' : '#d97706'};">
                                ${att.isCompleted ? 'مكتمل ✅' : 'متبقي ⚠️'}
                            </td>
                        </tr>
                    `;
                });
            }

            html += `
                    </tbody>
                </table>
            </div>
            `;
        });

        html += `</div>`;
    }

    // Official Verification & Sign-off Footer
    html += `
        <div style="margin-top: 35px; border-top: 2px solid #cbd5e1; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #475569;" class="avoid-break">
            <div>
                <p style="margin: 0 0 4px 0; font-weight: bold;">كنيسة الشهيد العظيم مارمينا - أسرة الانبا ارسانيوس والقديس نيقولاوس لوسائل الايضاح</p>
                <p style="margin: 0; color: #94a3b8; font-size: 10px;">تم إصدار هذا المستند رسمياً للاستخدام الإداري والخدمي فقط.</p>
            </div>
            <div style="text-align: center; min-width: 160px;">
                <p style="margin: 0 0 35px 0; font-weight: bold;">توقيع وموافقة أمين الخدمة:</p>
                <div style="border-bottom: 1px dashed #64748b; width: 140px; margin: 0 auto;"></div>
            </div>
        </div>
    </div>
    `;

    return html;
}

function generateCSV(scope, version, specificEventId, specificPersonId) {
    const dataset = getReportDataset(scope, specificEventId, specificPersonId);
    const { peopleData, eventsData, globalKPIs } = dataset;
    const isSummary = version === 'summary';

    const rows = [];
    // BOM for Excel Arabic support
    const BOM = '\uFEFF';

    // Report Header
    rows.push([escapeCSV('أسرة الانبا ارسانيوس والقديس نيقولاوس لوسائل الايضاح')]);
    rows.push([escapeCSV(`تقرير المتابعة - ${isSummary ? 'نسخة ملخصة للمسؤولين' : 'نسخة تفصيلية شاملة'}`)]);
    rows.push([escapeCSV(`تاريخ واستخراج التقرير: ${new Date().toLocaleDateString('ar-EG')} ${new Date().toLocaleTimeString('ar-EG')}`)]);
    rows.push([escapeCSV(`المسؤول: ${currentUser ? (currentUser.displayName || currentUser.email) : 'مسؤول النظام'}`)]);
    rows.push([]);

    // Global Statistics Block
    rows.push([escapeCSV('المؤشرات العامة للنظام:')]);
    rows.push([escapeCSV('إجمالي الخدام والأشخاص'), escapeCSV(globalKPIs.totalPeople)]);
    rows.push([escapeCSV('متوسط نسبة الالتزام'), escapeCSV(`${globalKPIs.avgAttendanceRate}%`)]);
    rows.push([escapeCSV('إجمالي مرات الـ Overload الإضافي'), escapeCSV(`+${globalKPIs.totalOverloadSum}`)]);
    rows.push([escapeCSV('المهام المنجزة'), escapeCSV(`${globalKPIs.totalCompletedTasks} من ${globalKPIs.totalTasks}`)]);
    rows.push([]);

    // SECTION: People Data
    if (scope !== 'specific-event') {
        rows.push([escapeCSV('=== كشف الخدام والأشخاص والالتزام ===')]);
        rows.push([
            escapeCSV('م'),
            escapeCSV('الاسم'),
            escapeCSV('أيام الحضور الفعلي'),
            escapeCSV('الغياب باعتذار'),
            escapeCSV('الغياب بدون عذر'),
            escapeCSV('نسبة الالتزام بالعذر %'),
            escapeCSV('نسبة الحضور المباشر %'),
            escapeCSV('حضور الأحداث (نزول)'),
            escapeCSV('مرات الـ Overload ⚡'),
            escapeCSV('المهام المنجزة'),
            escapeCSV('إجمالي المهام'),
            escapeCSV('تقييم الالتزام')
        ]);

        peopleData.forEach((p, idx) => {
            rows.push([
                escapeCSV(idx + 1),
                escapeCSV(p.name),
                escapeCSV(p.attendedDays),
                escapeCSV(p.excusedDays),
                escapeCSV(p.unexcusedDays),
                escapeCSV(`${p.commitmentRate}%`),
                escapeCSV(`${p.attendanceRate}%`),
                escapeCSV(p.totalEventSessions),
                escapeCSV(p.totalOverload),
                escapeCSV(p.completedTasks),
                escapeCSV(p.personTasks.length),
                escapeCSV(p.tier)
            ]);
        });
        rows.push([]);
    }

    // SECTION: Events Data
    if (scope !== 'specific-person' && scope !== 'attendance') {
        rows.push([escapeCSV('=== كشف الأحداث والمواسم وتتبع الـ Overload ===')]);
        rows.push([
            escapeCSV('م'),
            escapeCSV('اسم الحدث'),
            escapeCSV('تاريخ البداية'),
            escapeCSV('تاريخ النهاية'),
            escapeCSV('الحد المطلوب (الهدف)'),
            escapeCSV('عدد الحاضرين'),
            escapeCSV('أكملوا الحد المطلوب'),
            escapeCSV('إجمالي الـ Overload ⚡')
        ]);

        eventsData.forEach((ev, idx) => {
            rows.push([
                escapeCSV(idx + 1),
                escapeCSV(ev.name),
                escapeCSV(ev.startDate),
                escapeCSV(ev.endDate || '-'),
                escapeCSV(ev.targetCount),
                escapeCSV(ev.attendeesCount),
                escapeCSV(ev.completedTargetCount),
                escapeCSV(ev.totalOverloads)
            ]);
        });
        rows.push([]);
    }

    // DETAILED SECTIONS IN CSV
    if (!isSummary) {
        rows.push([escapeCSV('=== السجل الزمني التفصيلي للجلسات لكل شخص ===')]);
        rows.push([
            escapeCSV('اسم الشخص'),
            escapeCSV('تاريخ الجلسة'),
            escapeCSV('بيان الجلسة'),
            escapeCSV('الحالة'),
            escapeCSV('هل نزول إضافي Overload')
        ]);

        peopleData.forEach(p => {
            (p.attendance || []).forEach(s => {
                const isOverload = s.dayName && s.dayName.includes('Overload');
                rows.push([
                    escapeCSV(p.name),
                    escapeCSV(s.date),
                    escapeCSV(s.dayName || 'حضور عادي'),
                    escapeCSV(s.status ? 'حاضر' : 'غائب'),
                    escapeCSV(isOverload ? 'نعم (Overload ⚡)' : 'عادي')
                ]);
            });
        });
        rows.push([]);

        rows.push([escapeCSV('=== سجل حضور الأحداث التفصيلي لكل شخص ===')]);
        rows.push([
            escapeCSV('اسم الحدث'),
            escapeCSV('اسم الشخص'),
            escapeCSV('إجمالي النزول'),
            escapeCSV('النزول العادي'),
            escapeCSV('Overload ⚡'),
            escapeCSV('حالة اكتمال الهدف')
        ]);

        eventsData.forEach(ev => {
            ev.attendeesList.forEach(att => {
                rows.push([
                    escapeCSV(ev.name),
                    escapeCSV(att.personName),
                    escapeCSV(att.count),
                    escapeCSV(att.regularCount),
                    escapeCSV(att.overloadCount),
                    escapeCSV(att.isCompleted ? 'مكتمل' : 'متبقي')
                ]);
            });
        });
    }

    const csvContent = BOM + rows.map(r => r.join(',')).join('\r\n');
    return csvContent;
}

function renderReportPreview() {
    if (!printableReportArea) return;
    const html = generateReportHTML(
        currentExportScope, 
        currentExportVersion, 
        currentExportSpecificEventId, 
        currentExportSpecificPersonId
    );
    printableReportArea.innerHTML = html;

    if (previewMetaBadge) {
        const isSum = currentExportVersion === 'summary';
        previewMetaBadge.innerText = `${isSum ? '📋 نسخة ملخصة' : '📑 نسخة تفصيلية'} | جاهز للتحميل والطباعة`;
    }
}

function downloadReportCSV() {
    const csv = generateCSV(
        currentExportScope, 
        currentExportVersion, 
        currentExportSpecificEventId, 
        currentExportSpecificPersonId
    );
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `تقرير_حضور_${currentExportVersion === 'summary' ? 'ملخص' : 'تفصيلي'}_${dateStr}.csv`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showCustomAlert('تم التصدير بنجاح 📗', `تم تصدير وحفظ ملف ${filename} بنجاح بصيغة CSV متوافقة مع Excel مع دعم العربية الكامل.`);
}

async function downloadReportPDF() {
    const reportElement = document.getElementById('printableReportArea');
    if (!reportElement) return;

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `تقرير_متابعة_${currentExportVersion === 'summary' ? 'ملخص' : 'تفصيلي'}_${dateStr}.pdf`;

    if (typeof html2pdf !== 'function') {
        showCustomAlert('طباعة PDF', 'سيتم فتح نافذة الطباعة لاختيار حفظ كـ PDF من المتصفح مباشرة.');
        window.print();
        return;
    }

    const originalText = exportPdfBtn.innerHTML;
    exportPdfBtn.innerHTML = `<span>جاري التجهيز... ⏳</span>`;
    exportPdfBtn.disabled = true;

    const opt = {
        margin: [8, 8, 8, 8],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(reportElement).save();
        showCustomAlert('تم التحميل بنجاح 📕', `تم تحميل ملف التقرير ${filename} بنجاح.`);
    } catch (err) {
        console.error('html2pdf generation error, falling back to window.print:', err);
        window.print();
    } finally {
        exportPdfBtn.innerHTML = originalText;
        exportPdfBtn.disabled = false;
    }
}

function printReport() {
    window.print();
}

function openExportReportsCenter(scope = 'all', specificId = null) {
    currentExportScope = scope;
    if (exportScopeSelect) exportScopeSelect.value = scope;

    // Populate Specific Event Select
    if (exportSpecificEventSelect) {
        exportSpecificEventSelect.innerHTML = '';
        cachedEvents.forEach(ev => {
            const opt = document.createElement('option');
            opt.value = ev.id;
            opt.textContent = `${ev.name} (من: ${ev.startDate})`;
            exportSpecificEventSelect.appendChild(opt);
        });
        if (scope === 'specific-event' && specificId) {
            exportSpecificEventSelect.value = specificId;
            currentExportSpecificEventId = specificId;
        } else if (cachedEvents.length > 0) {
            currentExportSpecificEventId = cachedEvents[0].id;
        }
    }

    // Populate Specific Person Select
    if (exportSpecificPersonSelect) {
        exportSpecificPersonSelect.innerHTML = '';
        cachedPeople.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            exportSpecificPersonSelect.appendChild(opt);
        });
        if (scope === 'specific-person' && specificId) {
            exportSpecificPersonSelect.value = specificId;
            currentExportSpecificPersonId = specificId;
        } else if (cachedPeople.length > 0) {
            currentExportSpecificPersonId = cachedPeople[0].id;
        }
    }

    // Toggle specific select rows
    if (exportSpecificEventRow) {
        exportSpecificEventRow.classList.toggle('hidden', scope !== 'specific-event');
    }
    if (exportSpecificPersonRow) {
        exportSpecificPersonRow.classList.toggle('hidden', scope !== 'specific-person');
    }

    // Version Radio
    setExportVersion(currentExportVersion);

    // Render Preview
    renderReportPreview();

    // Show Modal
    if (exportReportsModal) exportReportsModal.style.display = 'flex';
}

function setExportVersion(version) {
    currentExportVersion = version;
    const radios = document.querySelectorAll('input[name="reportVersionRadio"]');
    radios.forEach(r => {
        r.checked = (r.value === version);
    });

    if (labelVersionSummary && labelVersionDetailed) {
        if (version === 'summary') {
            labelVersionSummary.className = 'report-version-card p-3 rounded-xl border-2 border-amber-500 bg-amber-500/15 cursor-pointer flex flex-col justify-between transition-all';
            labelVersionDetailed.className = 'report-version-card p-3 rounded-xl border border-white/20 bg-white/5 cursor-pointer flex flex-col justify-between transition-all opacity-80';
        } else {
            labelVersionSummary.className = 'report-version-card p-3 rounded-xl border border-white/20 bg-white/5 cursor-pointer flex flex-col justify-between transition-all opacity-80';
            labelVersionDetailed.className = 'report-version-card p-3 rounded-xl border-2 border-amber-500 bg-amber-500/15 cursor-pointer flex flex-col justify-between transition-all';
        }
    }

    renderReportPreview();
}

// --- EVENT LISTENERS INITIALIZATION ---
function initEventListeners() {
    // Auth Buttons
    googleSignInBtn.addEventListener('click', async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error('Sign-in error:', error);
            await showCustomAlert('خطأ في تسجيل الدخول', error.message);
        }
    });

    signOutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            await showCustomAlert('تسجيل الخروج', 'تم تسجيل الخروج بنجاح.');
        } catch (error) {
            console.error('Sign-out error:', error);
        }
    });

    syncDataBtn.addEventListener('click', syncDataToFirestore);

    // CRUD buttons
    addPersonBtn.addEventListener('click', addPerson);
    personNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') addPerson(); });

    quickAddBtn.addEventListener('click', () => {
        if (!canEdit()) {
            showCustomAlert('تنبيه', 'يجب تسجيل الدخول بحساب خادم أو مسؤول لاستخدام الحضور السريع.');
            return;
        }
        renderQuickAddList();
        quickAddModal.style.display = 'flex';
    });
    quickAddConfirmBtn.addEventListener('click', quickAddSessions);
    quickAddCancelBtn.addEventListener('click', () => quickAddModal.style.display = 'none');

    addTaskBtn.addEventListener('click', () => {
        if (!canEdit()) {
            showCustomAlert('تنبيه', 'يجب تسجيل الدخول بحساب خادم أو مسؤول لإضافة مهام.');
            return;
        }
        populatePersonChecklist();
        taskDateInput.value = new Date().toISOString().slice(0, 10);
        addTaskModal.style.display = 'flex';
    });
    addTaskConfirmBtn.addEventListener('click', addTask);
    addTaskCancelBtn.addEventListener('click', () => addTaskModal.style.display = 'none');
    editTaskSaveBtn.addEventListener('click', updateTask);
    editTaskCancelBtn.addEventListener('click', () => editTaskModal.style.display = 'none');

    // Events triggers
    const openAddEvent = () => {
        if (!canEdit()) {
            showCustomAlert('تنبيه', 'يجب تسجيل الدخول بحساب خادم أو مسؤول لإضافة حدث جديد.');
            return;
        }
        eventStartDateInput.value = new Date().toISOString().slice(0, 10);
        addEventModal.style.display = 'flex';
    };
    openAddEventModalBtn.addEventListener('click', openAddEvent);
    addEventQuickBtn.addEventListener('click', openAddEvent);
    saveEventBtn.addEventListener('click', addEvent);
    cancelEventBtn.addEventListener('click', () => addEventModal.style.display = 'none');

    // Event Attendance Modal triggers
    closeEventModalBtn.addEventListener('click', () => eventAttendanceModal.style.display = 'none');
    deleteEventBtn.addEventListener('click', () => {
        if (currentActiveEventId) deleteEvent(currentActiveEventId);
    });
    eventSelectAllBtn.addEventListener('click', () => {
        const cbs = eventPeopleChecklist.querySelectorAll('.event-person-cb');
        const allChecked = Array.from(cbs).every(c => c.checked);
        cbs.forEach(c => c.checked = !allChecked);
        eventSelectAllBtn.innerText = allChecked ? 'تحديد الكل' : 'إلغاء التحديد';
    });
    confirmRecordEventSessionBtn.addEventListener('click', recordBatchEventSession);
    searchEventPersonInput.addEventListener('input', () => {
        const ev = cachedEvents.find(e => e.id === currentActiveEventId);
        if (ev) renderEventRoster(ev);
    });

    // Roster filter tabs
    const setRosterFilter = (filter, activeBtn) => {
        currentRosterFilter = filter;
        ['filterAllEventBtn', 'filterAttendeesEventBtn', 'filterOverloadEventBtn', 'filterAbsentEventBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.className = 'px-2 py-1 bg-white/10 hover:bg-white/20 text-gray-300 cursor-pointer';
        });
        if (activeBtn) activeBtn.className = 'px-2 py-1 bg-amber-500 text-white font-bold cursor-pointer';
        const ev = cachedEvents.find(e => e.id === currentActiveEventId);
        if (ev) renderEventRoster(ev);
    };

    const filterAllBtn = document.getElementById('filterAllEventBtn');
    const filterAttBtn = document.getElementById('filterAttendeesEventBtn');
    const filterOvrBtn = document.getElementById('filterOverloadEventBtn');
    const filterAbsBtn = document.getElementById('filterAbsentEventBtn');

    if (filterAllBtn) filterAllBtn.addEventListener('click', (e) => setRosterFilter('all', e.currentTarget));
    if (filterAttBtn) filterAttBtn.addEventListener('click', (e) => setRosterFilter('attendees', e.currentTarget));
    if (filterOvrBtn) filterOvrBtn.addEventListener('click', (e) => setRosterFilter('overload', e.currentTarget));
    if (filterAbsBtn) filterAbsBtn.addEventListener('click', (e) => setRosterFilter('absent', e.currentTarget));

    // Analytics Modal triggers
    closeAnalyticsBtn.addEventListener('click', () => personAnalyticsModal.style.display = 'none');
    closeAnalyticsOkBtn.addEventListener('click', () => personAnalyticsModal.style.display = 'none');

    // Reports & Export Center triggers
    if (openExportCenterBtn) {
        openExportCenterBtn.addEventListener('click', () => openExportReportsCenter('all'));
    }
    if (exportEventReportBtn) {
        exportEventReportBtn.addEventListener('click', () => {
            if (currentActiveEventId) {
                openExportReportsCenter('specific-event', currentActiveEventId);
            } else {
                openExportReportsCenter('events');
            }
        });
    }
    if (exportPersonReportBtn) {
        exportPersonReportBtn.addEventListener('click', () => {
            if (currentAnalyticsPersonId) {
                openExportReportsCenter('specific-person', currentAnalyticsPersonId);
            } else {
                openExportReportsCenter('all');
            }
        });
    }

    if (closeExportModalBtn) closeExportModalBtn.addEventListener('click', () => exportReportsModal.style.display = 'none');
    if (closeExportBottomBtn) closeExportBottomBtn.addEventListener('click', () => exportReportsModal.style.display = 'none');

    if (exportScopeSelect) {
        exportScopeSelect.addEventListener('change', (e) => {
            currentExportScope = e.target.value;
            if (exportSpecificEventRow) {
                exportSpecificEventRow.classList.toggle('hidden', currentExportScope !== 'specific-event');
            }
            if (exportSpecificPersonRow) {
                exportSpecificPersonRow.classList.toggle('hidden', currentExportScope !== 'specific-person');
            }
            renderReportPreview();
        });
    }

    if (exportSpecificEventSelect) {
        exportSpecificEventSelect.addEventListener('change', (e) => {
            currentExportSpecificEventId = e.target.value;
            renderReportPreview();
        });
    }

    if (exportSpecificPersonSelect) {
        exportSpecificPersonSelect.addEventListener('change', (e) => {
            currentExportSpecificPersonId = e.target.value;
            renderReportPreview();
        });
    }

    // Version Radio Listeners
    document.querySelectorAll('input[name="reportVersionRadio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            setExportVersion(e.target.value);
        });
    });

    if (labelVersionSummary) {
        labelVersionSummary.addEventListener('click', () => setExportVersion('summary'));
    }
    if (labelVersionDetailed) {
        labelVersionDetailed.addEventListener('click', () => setExportVersion('detailed'));
    }

    if (exportCsvBtn) exportCsvBtn.addEventListener('click', downloadReportCSV);
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', downloadReportPDF);
    if (printReportBtn) printReportBtn.addEventListener('click', printReport);
    if (refreshReportPreviewBtn) refreshReportPreviewBtn.addEventListener('click', renderReportPreview);

    themeToggleBtn.addEventListener('click', toggleTheme);
    languageToggleBtn.addEventListener('click', toggleLanguage);
    editNameSaveBtn.addEventListener('click', updatePersonName);
    editNameCancelBtn.addEventListener('click', () => editNameModal.style.display = 'none');
    editDaySaveBtn.addEventListener('click', updateDay);
    editDayCancelBtn.addEventListener('click', () => editDayModal.style.display = 'none');

    // Admin Insights Section Listeners
    if (toggleAdminInsightsBtn) {
        toggleAdminInsightsBtn.addEventListener('click', () => {
            adminInsightsExpanded = !adminInsightsExpanded;
            if (adminInsightsContent) {
                adminInsightsContent.classList.toggle('hidden', !adminInsightsExpanded);
            }
            if (toggleAdminInsightsText) {
                toggleAdminInsightsText.innerText = adminInsightsExpanded ? 'إخفاء المركز' : 'عرض المركز';
            }
        });
    }

    if (copyAdminBriefBtn) {
        copyAdminBriefBtn.addEventListener('click', copyAdminBrief);
    }

    if (questionTabsContainer) {
        questionTabsContainer.querySelectorAll('.question-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.currentTarget;
                const qKey = targetBtn.dataset.q;
                if (!qKey) return;
                currentAdminQuestion = qKey;
                questionTabsContainer.querySelectorAll('.question-tab-btn').forEach(b => {
                    b.classList.remove('active', 'border-amber-500', 'bg-amber-500/20');
                    b.classList.add('border-white/10', 'bg-white/5');
                });
                targetBtn.classList.add('active', 'border-amber-500', 'bg-amber-500/20');
                targetBtn.classList.remove('border-white/10', 'bg-white/5');
                renderAdminQuestionResults(currentAdminQuestion);
            });
        });
    }

    if (insightsSearchInput) {
        insightsSearchInput.addEventListener('input', () => {
            renderAdminQuestionResults(currentAdminQuestion);
        });
    }

    // Quick Add Toolbar & Close
    if (quickAddSearchInput) {
        quickAddSearchInput.addEventListener('input', () => {
            renderQuickAddList();
        });
    }

    if (markAllPresentBtn) {
        markAllPresentBtn.addEventListener('click', () => {
            const rows = quickAddList.querySelectorAll('.quick-add-person-row');
            rows.forEach(row => {
                const pId = row.dataset.personId;
                const radio = row.querySelector(`input[name="status_${pId}"][value="present"]`);
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change'));
                }
            });
        });
    }

    if (markAllAbsentBtn) {
        markAllAbsentBtn.addEventListener('click', () => {
            const rows = quickAddList.querySelectorAll('.quick-add-person-row');
            rows.forEach(row => {
                const pId = row.dataset.personId;
                const radio = row.querySelector(`input[name="status_${pId}"][value="absent"]`);
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change'));
                }
            });
        });
    }

    if (quickAddCloseXBtn) {
        quickAddCloseXBtn.addEventListener('click', () => {
            quickAddModal.style.display = 'none';
        });
    }

    if (closeEditDayXBtn) {
        closeEditDayXBtn.addEventListener('click', () => {
            editDayModal.style.display = 'none';
        });
    }

    if (closeDayDetailsXBtn) {
        closeDayDetailsXBtn.addEventListener('click', () => {
            dayDetailsModal.style.display = 'none';
        });
    }

    if (closeDayDetailsBtn) {
        closeDayDetailsBtn.addEventListener('click', () => {
            dayDetailsModal.style.display = 'none';
        });
    }

    if (closePersonHistoryXBtn) {
        closePersonHistoryXBtn.addEventListener('click', () => {
            personHistoryModal.style.display = 'none';
        });
    }

    if (closePersonHistoryBtn) {
        closePersonHistoryBtn.addEventListener('click', () => {
            personHistoryModal.style.display = 'none';
        });
    }

    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
}

// --- BOOTSTRAP APP ---
document.addEventListener('DOMContentLoaded', async () => {
    initializeTheme();
    applyLanguageToPage();
    new MutationObserver(() => applyLanguageToPage()).observe(document.body, { childList: true, subtree: true });
    createFloatingSymbols();
    initEventListeners();

    const today = new Date().toISOString().slice(0, 10);
    if (taskDateInput) taskDateInput.value = today;

    // Load initial data from local server API immediately for instant display
    await fetchPeopleFallback();
    await fetchTasksFallback();
    await fetchEventsFallback();

    // Test Firestore Connection
    try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        connectionStatusDot.classList.add('online');
        connectionStatusText.innerText = 'متصل سحابياً ⚡';
    } catch (e) {
        if (e && e.code === 'permission-denied') {
            connectionStatusDot.classList.add('online');
            connectionStatusText.innerText = 'متصل سحابياً ⚡';
        } else {
            connectionStatusDot.classList.remove('online');
            connectionStatusText.innerText = 'سيرفر محلي';
        }
    }

    // Set up Realtime Firestore Sync
    setupRealtimeListeners();

    // Listen to Auth State
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
            loggedOutView.classList.add('hidden');
            loggedInView.classList.remove('hidden');
            userName.textContent = user.displayName || user.email.split('@')[0];
            userEmail.textContent = user.email;
            if (user.photoURL) {
                userAvatar.src = user.photoURL;
            } else {
                userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=d7ad5c&color=fff`;
            }

            // Determine Role
            if (user.email === ADMIN_EMAIL) {
                currentUserRole = 'admin';
                try {
                    await setDoc(doc(db, 'admins', user.uid), {
                        email: user.email,
                        role: 'admin',
                        createdAt: new Date().toISOString()
                    }, { merge: true });
                    await setDoc(doc(db, 'users', user.uid), {
                        email: user.email,
                        displayName: user.displayName || '',
                        role: 'admin',
                        createdAt: new Date().toISOString()
                    }, { merge: true });
                } catch (e) {
                    console.warn('Admin record write check:', e);
                }
            } else {
                try {
                    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
                    if (adminDoc.exists()) {
                        currentUserRole = 'admin';
                    } else {
                        const userDoc = await getDoc(doc(db, 'users', user.uid));
                        if (userDoc.exists() && userDoc.data().role) {
                            currentUserRole = userDoc.data().role;
                        } else {
                            currentUserRole = 'servant';
                            await setDoc(doc(db, 'users', user.uid), {
                                email: user.email,
                                displayName: user.displayName || '',
                                role: 'servant',
                                createdAt: new Date().toISOString()
                            }, { merge: true });
                        }
                    }
                } catch (e) {
                    currentUserRole = 'servant';
                }
            }

            // Update badge in UI
            if (currentUserRole === 'admin') {
                userRoleBadge.textContent = '👑 مسؤول النظام';
                userRoleBadge.className = 'text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-500 text-white shadow';
            } else if (currentUserRole === 'servant') {
                userRoleBadge.textContent = '✍️ خادم';
                userRoleBadge.className = 'text-xs px-2 py-0.5 rounded-full font-semibold bg-blue-600 text-white shadow';
            } else {
                userRoleBadge.textContent = '👁️ مستعرض';
                userRoleBadge.className = 'text-xs px-2 py-0.5 rounded-full font-semibold bg-gray-600 text-white shadow';
            }

            checkIfMigrationNeeded();
        } else {
            currentUser = null;
            currentUserRole = 'viewer';
            loggedOutView.classList.remove('hidden');
            loggedInView.classList.add('hidden');
            syncDataBtn.classList.add('hidden');
        }
        updateUIForRole();
    });
});
