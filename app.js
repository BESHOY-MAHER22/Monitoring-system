// app.js - Normalized Attendance Engine, Smart Plan & Notebook, and Visual Analytics
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
    getDocFromServer 
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
let currentUserRole = localStorage.getItem('passkey_role') || 'servant'; // Default open servant mode for seamless preview

function canEdit() {
    return true; // Always allow editing in preview for open interactive demo
}
function isAdmin() {
    return currentUserRole === 'admin';
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

// Day Type Info & Badges: 1. اجتماع 2. شغل 3. اجتماع وشغل
function getDayTypeInfo(dayType) {
    switch (dayType) {
        case 'work':
            return {
                label: 'شغل',
                fullLabel: '2. شغل 🛠️',
                badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
            };
        case 'meeting_work':
            return {
                label: 'اجتماع وشغل',
                fullLabel: '3. اجتماع وشغل 📖🛠️',
                badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
            };
        case 'meeting':
        default:
            return {
                label: 'اجتماع',
                fullLabel: '1. اجتماع 📖',
                badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
            };
    }
}

function getDayTypeBadge(dayType) {
    const info = getDayTypeInfo(dayType);
    return `<span class="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full border font-bold ${info.badgeClass}">${info.fullLabel}</span>`;
}

// Format Plan Text to HTML with Bold & Text formatting preserved
function formatWhatsAppToHTML(text) {
    if (!text) return '<span class="text-gray-400">لا يوجد نص تفصيلي للخطة حتى الآن. اضغط على "تعديل الخطة" لإضافة جدول الخطة.</span>';
    let formatted = escapeHTML(text);
    // Replace *text* with <strong>text</strong>
    formatted = formatted.replace(/\*([^*]+)\*/g, '<strong class="text-amber-800 dark:text-amber-300 font-bold">$1</strong>');
    // Replace _text_ with <em>text</em>
    formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');
    // Replace ~text~ with <del>text</del>
    formatted = formatted.replace(/~([^~]+)~/g, '<del class="opacity-75">$1</del>');
    return formatted;
}

// --- NORMALIZED STATE (SINGLE SOURCE OF TRUTH) ---
let cachedPeople = [];
let cachedActivePlan = null;
let cachedAttendanceSessions = {};
let cachedTasks = [];
let cachedEvents = [];

let personCardsSearchQuery = '';
let currentRoleFilter = 'all'; // 'all' | 'servants' | 'members'
let currentAdminQuestion = 'unexcused';
let adminInsightsExpanded = true;
let currentLanguage = localStorage.getItem('language') === 'en' ? 'en' : 'ar';
let chartInstances = {};

// --- UI ELEMENT HOOKS ---
const personNameInput = document.getElementById('personNameInput');
const addPersonBtn = document.getElementById('addPersonBtn');
const openAddPersonModalBtn = document.getElementById('openAddPersonModalBtn');
const quickAddBtn = document.getElementById('quickAddBtn');
const addTaskBtn = document.getElementById('addTaskBtn');
const openAddEventModalBtn = document.getElementById('openAddEventModalBtn');
const addEventQuickBtn = document.getElementById('addEventQuickBtn');
const openExportCenterBtn = document.getElementById('openExportCenterBtn');

// Hero Plan & Notebook Hooks
const planHeroTitle = document.getElementById('planHeroTitle');
const planHeroDates = document.getElementById('planHeroDates');
const planWhatsAppFormattedText = document.getElementById('planWhatsAppFormattedText');
const planScheduledDaysPillsContainer = document.getElementById('planScheduledDaysPillsContainer');
const copyPlanWhatsAppBtn = document.getElementById('copyPlanWhatsAppBtn');
const openEditPlanModalBtn = document.getElementById('openEditPlanModalBtn');

const notebookHeroTitle = document.getElementById('notebookHeroTitle');
const notebookHeroContent = document.getElementById('notebookHeroContent');
const notebookHeroUpdated = document.getElementById('notebookHeroUpdated');
const quickEditNotebookBtn = document.getElementById('quickEditNotebookBtn');

// Missed Days Banner Hooks
const pendingMissedDaysBanner = document.getElementById('pendingMissedDaysBanner');
const missedDaysCountBadge = document.getElementById('missedDaysCountBadge');
const missedDaysChipsContainer = document.getElementById('missedDaysChipsContainer');
const openExtraDayModalBtn = document.getElementById('openExtraDayModalBtn');

// People & Search Hooks
const personCardsContainer = document.getElementById('personCardsContainer');
const personCardsSearchInput = document.getElementById('personCardsSearchInput');
const clearPersonCardsSearchBtn = document.getElementById('clearPersonCardsSearchBtn');
const personSearchResultsCount = document.getElementById('personSearchResultsCount');
const loadingIndicator = document.getElementById('loadingIndicator');
const noDataMessage = document.getElementById('noDataMessage');
const connectionError = document.getElementById('connectionError');
const connectionStatusDot = document.getElementById('connectionStatus');
const connectionStatusText = document.getElementById('connectionText');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const languageToggleBtn = document.getElementById('languageToggleBtn');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');

// Auth Bar Hooks
const loggedOutView = document.getElementById('loggedOutView');
const loggedInView = document.getElementById('loggedInView');
const passkeySignInBtn = document.getElementById('passkeySignInBtn');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const modalGoogleSignInBtn = document.getElementById('modalGoogleSignInBtn');
const signOutBtn = document.getElementById('signOutBtn');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const userRoleBadge = document.getElementById('userRoleBadge');

// Modals
const planModal = document.getElementById('planModal');
const closePlanModalXBtn = document.getElementById('closePlanModalXBtn');
const planTitleInput = document.getElementById('planTitleInput');
const planStartDateInput = document.getElementById('planStartDateInput');
const planEndDateInput = document.getElementById('planEndDateInput');
const planRawTextInput = document.getElementById('planRawTextInput');
const parseWhatsAppPlanBtn = document.getElementById('parseWhatsAppPlanBtn');
const scheduledDaysListContainer = document.getElementById('scheduledDaysListContainer');
const scheduledDaysCount = document.getElementById('scheduledDaysCount');
const addNewScheduledDayBtn = document.getElementById('addNewScheduledDayBtn');
const notebookTitleInput = document.getElementById('notebookTitleInput');
const notebookContentInput = document.getElementById('notebookContentInput');
const savePlanModalBtn = document.getElementById('savePlanModalBtn');
const cancelPlanModalBtn = document.getElementById('cancelPlanModalBtn');

const notebookQuickModal = document.getElementById('notebookQuickModal');
const closeNotebookQuickXBtn = document.getElementById('closeNotebookQuickXBtn');
const quickNotebookTitleInput = document.getElementById('quickNotebookTitleInput');
const quickNotebookContentInput = document.getElementById('quickNotebookContentInput');
const saveQuickNotebookBtn = document.getElementById('saveQuickNotebookBtn');
const cancelQuickNotebookBtn = document.getElementById('cancelQuickNotebookBtn');

const extraDayModal = document.getElementById('extraDayModal');
const closeExtraDayXBtn = document.getElementById('closeExtraDayXBtn');
const extraDayDateInput = document.getElementById('extraDayDateInput');
const extraDayTitleInput = document.getElementById('extraDayTitleInput');
const confirmExtraDayBtn = document.getElementById('confirmExtraDayBtn');
const cancelExtraDayBtn = document.getElementById('cancelExtraDayBtn');

const passkeyLoginModal = document.getElementById('passkeyLoginModal');
const closePasskeyLoginXBtn = document.getElementById('closePasskeyLoginXBtn');
const passkeyInput = document.getElementById('passkeyInput');
const confirmPasskeyBtn = document.getElementById('confirmPasskeyBtn');

const addPersonModal = document.getElementById('addPersonModal');
const closeAddPersonModalXBtn = document.getElementById('closeAddPersonModalXBtn');
const newPersonFullNameInput = document.getElementById('newPersonFullNameInput');
const newPersonRoleSelect = document.getElementById('newPersonRoleSelect');
const newPersonBirthdateInput = document.getElementById('newPersonBirthdateInput');
const newPersonNotesInput = document.getElementById('newPersonNotesInput');
const confirmAddPersonBtn = document.getElementById('confirmAddPersonBtn');
const cancelAddPersonBtn = document.getElementById('cancelAddPersonBtn');

// Quick Add Attendance Modal
const quickAddModal = document.getElementById('quickAddModal');
const quickAddCloseXBtn = document.getElementById('quickAddCloseXBtn');
const quickAddList = document.getElementById('quickAddList');
const dayNameInput = document.getElementById('dayNameInput');
const quickAddDateInput = document.getElementById('quickAddDateInput');
const quickAddDayTypeSelect = document.getElementById('quickAddDayTypeSelect');
const markAllPresentBtn = document.getElementById('markAllPresentBtn');
const markAllAbsentBtn = document.getElementById('markAllAbsentBtn');
const quickAddSearchInput = document.getElementById('quickAddSearchInput');
const quickAddConfirmBtn = document.getElementById('quickAddConfirmBtn');
const quickAddCancelBtn = document.getElementById('quickAddCancelBtn');

// Toast Notification
function showToast(message, isError = false) {
    const existing = document.getElementById('systemToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'systemToast';
    toast.className = `fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md text-white text-xs font-bold transition-all duration-300 transform translate-y-4 opacity-0 flex items-center gap-2 ${isError ? 'bg-red-600/90 border border-red-400' : 'bg-emerald-600/90 border border-emerald-400'}`;
    toast.innerHTML = `<span>${isError ? '⚠️' : '✅'}</span><span>${escapeHTML(message)}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('translate-y-4', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    }, 10);

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Alert Modal
function showCustomAlert(message, title = 'تنبيه') {
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

function showCustomConfirm(message, title = 'تأكيد') {
    return new Promise(resolve => {
        const modal = document.getElementById('customConfirmModal');
        document.getElementById('confirmTitle').innerText = title;
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

// Dynamic Stats Computation from normalized attendanceSessions
function calculatePeopleStats(people, attendanceSessions, tasks, events) {
    const sessions = Object.values(attendanceSessions || {});
    return (people || []).map(person => {
        let attendedSessions = 0;
        let excusedSessions = 0;
        let unexcusedSessions = 0;
        let totalSessions = 0;
        const virtualAttendance = [];

        sessions.forEach(session => {
            if (!session.records) return;
            const status = session.records[person.id];
            if (status !== undefined) {
                totalSessions++;
                const isPresent = status === 'present' || status === 'late';
                const isExcused = status === 'excused';
                const isAbsent = status === 'absent';

                if (isPresent) attendedSessions++;
                if (isExcused) excusedSessions++;
                if (isAbsent) unexcusedSessions++;

                virtualAttendance.push({
                    date: session.date,
                    status: isPresent,
                    excused: isExcused,
                    isLate: status === 'late',
                    dayName: session.title || '',
                    dayType: session.dayType || 'meeting',
                    eventId: session.linkedEventId || null
                });
            }
        });

        virtualAttendance.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Commitment ratio according to user rule: attended out of (total - excused)
        const requiredSessions = totalSessions - excusedSessions;
        let commitmentRatio = 0;
        if (requiredSessions > 0) {
            commitmentRatio = Math.min(1, attendedSessions / requiredSessions);
        } else if (totalSessions > 0 && excusedSessions === totalSessions) {
            commitmentRatio = 1;
        }

        const attendanceRatio = totalSessions === 0 ? 0 : attendedSessions / totalSessions;

        // Streak analysis for urgent visitation / pastoral follow-up
        let consecutiveAbsences = 0;
        for (const session of virtualAttendance) {
            if (!session.status) {
                consecutiveAbsences++;
            } else {
                break;
            }
        }

        const personTasks = (tasks || []).filter(t => t.personId === person.id);
        const totalTasks = personTasks.length;
        const completedTasks = personTasks.filter(t => t.status === 'completed').length;
        const taskRatio = totalTasks === 0 ? 0 : completedTasks / totalTasks;

        // Overload across events
        let totalOverload = 0;
        (events || []).forEach(ev => {
            const target = ev.targetCount || 2;
            const count = virtualAttendance.filter(s => s.status && (s.eventId === ev.id || (s.dayName && s.dayName.includes(ev.name)))).length;
            if (count > target) {
                totalOverload += (count - target);
            }
        });

        const needsFollowUp = consecutiveAbsences >= 2 || unexcusedSessions >= 2;

        return {
            ...person,
            role: 'servant',
            birthdate: person.birthdate || '',
            notes: person.notes || '',
            attendance: virtualAttendance,
            attendedSessions,
            excusedSessions,
            unexcusedSessions,
            totalSessions,
            requiredSessions,
            commitmentRatio,
            attendanceRatio,
            consecutiveAbsences,
            needsFollowUp,
            totalTasks,
            completedTasks,
            taskRatio,
            totalOverload
        };
    });
}

// --- 1. HERO PLAN & NOTEBOOK SHOWCASE ---
function renderPlanAndNotebookHero() {
    if (!cachedActivePlan) return;

    if (planHeroTitle) planHeroTitle.innerText = cachedActivePlan.title || 'خطة خدمة وسائل الإيضاح';
    if (planHeroDates) {
        if (cachedActivePlan.startDate && cachedActivePlan.endDate) {
            planHeroDates.innerText = `من ${cachedActivePlan.startDate} إلى ${cachedActivePlan.endDate}`;
        } else {
            planHeroDates.innerText = 'أكتوبر ونوفمبر 2026';
        }
    }

    if (planWhatsAppFormattedText) {
        planWhatsAppFormattedText.innerHTML = formatWhatsAppToHTML(cachedActivePlan.rawWhatsAppText);
    }

    // Render interactive scheduled days pills
    if (planScheduledDaysPillsContainer) {
        planScheduledDaysPillsContainer.innerHTML = '';
        const scheduledDays = cachedActivePlan.scheduledDays || [];
        const todayStr = new Date().toISOString().slice(0, 10);

        scheduledDays.forEach(day => {
            const session = cachedAttendanceSessions[day.date];
            const isCompleted = session && session.isCompleted;
            const isPastOrToday = day.date <= todayStr;

            let pillStyle = '';
            let statusIcon = '';
            let statusLabel = '';

            if (isCompleted) {
                pillStyle = 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/40 hover:bg-emerald-500/30';
                statusIcon = '✅';
                statusLabel = 'تم تسجيل الحضور';
            } else if (isPastOrToday) {
                pillStyle = 'bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-500/40 hover:bg-rose-500/30 animate-pulse';
                statusIcon = '⏳';
                statusLabel = 'لم يُسجل الغياب (اضغط للتسجيل)';
            } else {
                pillStyle = 'bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/30 hover:bg-blue-500/25';
                statusIcon = '📅';
                statusLabel = 'يوم قادم';
            }

            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = `plan-day-pill px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm ${pillStyle}`;
            pill.setAttribute('title', `${day.dayTitle || 'يوم بالخطة'} - ${statusLabel}`);
            pill.innerHTML = `
                <span>${statusIcon}</span>
                <span>${escapeHTML(day.date)}: ${escapeHTML(day.dayTitle || 'يوم بالخطة')}</span>
            `;

            pill.addEventListener('click', () => {
                openAttendanceModalForDate(day.date, day.dayTitle, day.linkedEventId);
            });

            planScheduledDaysPillsContainer.appendChild(pill);
        });
    }
}

// --- 2. MISSED-DAYS AUTO DETECTOR ---
function checkAndRenderMissedDays() {
    if (!cachedActivePlan || !Array.isArray(cachedActivePlan.scheduledDays)) {
        if (pendingMissedDaysBanner) pendingMissedDaysBanner.classList.add('hidden');
        return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const missedDays = cachedActivePlan.scheduledDays.filter(day => {
        if (day.date > todayStr) return false;
        const session = cachedAttendanceSessions[day.date];
        return !session || !session.isCompleted;
    });

    if (missedDays.length === 0) {
        if (pendingMissedDaysBanner) pendingMissedDaysBanner.classList.add('hidden');
        return;
    }

    if (pendingMissedDaysBanner) pendingMissedDaysBanner.classList.remove('hidden');
    if (missedDaysCountBadge) {
        missedDaysCountBadge.innerText = `${missedDays.length} ${missedDays.length === 1 ? 'يوم فائت' : 'أيام فائتة'}`;
    }

    if (missedDaysChipsContainer) {
        missedDaysChipsContainer.innerHTML = '';
        missedDays.forEach(day => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95';
            chip.innerHTML = `
                <span>⚠️ ${escapeHTML(day.date)}: ${escapeHTML(day.dayTitle || 'غياب فائت')}</span>
                <span class="text-[10px] underline">اضغط لأخذ الغياب ✍️</span>
            `;
            chip.addEventListener('click', () => {
                openAttendanceModalForDate(day.date, day.dayTitle, day.linkedEventId);
            });
            missedDaysChipsContainer.appendChild(chip);
        });
    }
}

// Open Attendance Recording Modal Pre-loaded for exact date
function openAttendanceModalForDate(targetDate, targetTitle = '', linkedEventId = null, forcedDayType = null) {
    if (quickAddDateInput) quickAddDateInput.value = targetDate;
    if (dayNameInput) dayNameInput.value = targetTitle || `جلسة حضور ${targetDate}`;

    const existingSession = cachedAttendanceSessions[targetDate];
    const dayTypeVal = forcedDayType || existingSession?.dayType || 'meeting';
    if (quickAddDayTypeSelect) {
        quickAddDayTypeSelect.value = dayTypeVal;
    }

    renderQuickAddListForDate(targetDate);
    if (quickAddModal) quickAddModal.style.display = 'flex';
}

// Render dynamic checklist in quickAddModal
function renderQuickAddListForDate(dateStr) {
    if (!quickAddList) return;
    quickAddList.innerHTML = '';

    const session = cachedAttendanceSessions[dateStr];
    const existingRecords = session?.records || {};
    const query = (quickAddSearchInput?.value || '').trim().toLowerCase();

    cachedPeople.forEach(person => {
        if (query && !person.name.toLowerCase().includes(query)) return;

        const currentStatus = existingRecords[person.id] || 'present';
        const row = document.createElement('div');
        row.className = 'quick-add-person-row p-2.5 flex items-center justify-between gap-2 hover:bg-white/10 rounded-lg transition';
        row.dataset.personId = person.id;

        const safeName = escapeHTML(person.name);
        const roleBadge = '<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">خادم ✝️</span>';

        row.innerHTML = `
            <div class="flex items-center gap-2 text-right">
                <span class="font-bold text-xs">${safeName}</span>
                ${roleBadge}
            </div>
            <div class="flex items-center gap-3 text-xs">
                <label class="flex items-center gap-1 cursor-pointer font-semibold text-emerald-600">
                    <input type="radio" name="status_${person.id}" value="present" ${currentStatus === 'present' ? 'checked' : ''} class="accent-emerald-600">
                    <span>حاضر</span>
                </label>
                <label class="flex items-center gap-1 cursor-pointer font-semibold text-amber-600">
                    <input type="radio" name="status_${person.id}" value="excused" ${currentStatus === 'excused' ? 'checked' : ''} class="accent-amber-600">
                    <span>عذر</span>
                </label>
                <label class="flex items-center gap-1 cursor-pointer font-semibold text-red-600">
                    <input type="radio" name="status_${person.id}" value="absent" ${currentStatus === 'absent' ? 'checked' : ''} class="accent-red-600">
                    <span>غائب</span>
                </label>
            </div>
        `;
        quickAddList.appendChild(row);
    });
}

// --- 3. RENDER PERSON CARDS ---
function renderCardsFromCache() {
    if (!personCardsContainer) return;
    if (loadingIndicator) loadingIndicator.classList.add('hidden');
    if (connectionError) connectionError.classList.add('hidden');
    personCardsContainer.innerHTML = '';

    const allPeopleWithStats = calculatePeopleStats(cachedPeople, cachedAttendanceSessions, cachedTasks, cachedEvents);

    if (allPeopleWithStats.length === 0) {
        if (noDataMessage) noDataMessage.classList.remove('hidden');
        if (personSearchResultsCount) personSearchResultsCount.innerText = '0 شخص';
        return;
    }
    if (noDataMessage) noDataMessage.classList.add('hidden');

    // Filter by query (Name only)
    const query = (personCardsSearchQuery || '').trim().toLowerCase();
    const filteredPeople = allPeopleWithStats.filter(person => {
        if (!query) return true;
        return (person.name || '').toLowerCase().includes(query);
    });

    if (personSearchResultsCount) {
        personSearchResultsCount.innerText = `${filteredPeople.length} من ${allPeopleWithStats.length} شخص`;
    }
    if (clearPersonCardsSearchBtn) {
        clearPersonCardsSearchBtn.classList.toggle('hidden', !query);
    }

    if (filteredPeople.length === 0) {
        personCardsContainer.innerHTML = `
            <div class="col-span-full text-center py-12 p-6 rounded-3xl liquid-glass">
                <span class="text-4xl block mb-2">🔍</span>
                <h4 class="text-base font-bold mb-1" style="color: var(--card-text-color)">لا توجد نتائج مطابقة للبحث "${escapeHTML(personCardsSearchQuery)}"</h4>
                <p class="text-xs text-gray-500">تأكد من كتابة الاسم بصورة صحيحة.</p>
                <button type="button" onclick="window.clearPersonSearchAndFocus()" class="mt-4 px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white cursor-pointer hover:bg-amber-600 transition shadow">
                    عرض جميع الأفراد
                </button>
            </div>
        `;
        renderAdminInsights();
        return;
    }

    filteredPeople.forEach(person => {
        const card = document.createElement('div');
        card.className = 'person-card';
        card.setAttribute('data-id', person.id);

        const safeRawName = escapeHTML(person.name);
        const firstLetter = safeRawName.charAt(0);
        const commitmentPercentage = (person.commitmentRatio * 100).toFixed(0);

        // Progress bar color gradient
        let progressColor = 'linear-gradient(90deg, #10b981, #059669)';
        if (person.commitmentRatio < 0.5) {
            progressColor = 'linear-gradient(90deg, #ef4444, #dc2626)';
        } else if (person.commitmentRatio < 0.8) {
            progressColor = 'linear-gradient(90deg, #f59e0b, #d97706)';
        }

        card.innerHTML = `
            <div class="absolute top-4 left-4 flex gap-1 z-20">
                <button class="analytics-person-btn p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-600 dark:text-amber-300 transition cursor-pointer" data-id="${escapeHTML(person.id)}" title="رسوم بيانية وإحصائيات">
                    📊
                </button>
                <button class="edit-name-btn p-1.5 rounded-lg hover:bg-white/20 transition cursor-pointer" data-id="${escapeHTML(person.id)}" title="تعديل الاسم" style="color: inherit">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                </button>
                <button class="delete-person-btn p-1.5 rounded-lg hover:bg-white/20 transition cursor-pointer text-red-500" data-id="${escapeHTML(person.id)}" title="حذف الشخص">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
            </div>

            <!-- Avatar & Role Badge -->
            <div class="avatar shadow-md" data-id="${escapeHTML(person.id)}">
                ${firstLetter}
            </div>
            
            <div class="flex items-center gap-1.5 mt-2">
                <h3 class="text-xl font-bold cursor-pointer" data-id="${escapeHTML(person.id)}">${safeRawName}</h3>
                <span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500 text-white shadow-sm">خادم ✝️</span>
            </div>


            ${person.totalOverload > 0 ? `
            <div class="mt-2 px-3 py-0.5 rounded-full text-xs font-bold bg-purple-500 text-white shadow-sm flex items-center gap-1">
                <span>⚡ Overload: +${person.totalOverload} نزول</span>
            </div>` : ''}

            ${person.needsFollowUp ? `
            <div class="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 border border-red-500/30 text-red-700 dark:text-red-300 flex items-center gap-1">
                <span>⚠️ يحتاج افتقاد (غائب ${person.consecutiveAbsences} جلسات)</span>
            </div>` : ''}

            <!-- Attendance Rate Progress Bar -->
            <div class="w-full mt-3 px-2">
                <div class="flex justify-between items-center text-[11px] font-bold mb-1">
                    <span>نسبة الالتزام بالعذر:</span>
                    <span class="text-amber-800 dark:text-amber-200">${commitmentPercentage}%</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${commitmentPercentage}%; background: ${progressColor};"></div>
                </div>
            </div>

            <!-- Attendance Metrics Box -->
            <div class="attendance-box mt-3 w-full p-2.5">
                <div class="flex items-center justify-center gap-2 text-xs font-bold w-full">
                    <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-200" title="حاضر">🟢 ${person.attendedSessions}</span>
                    <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200" title="غياب باعتذار">🟡 ${person.excusedSessions}</span>
                    <span class="px-2 py-0.5 rounded bg-red-500/20 text-red-800 dark:text-red-200" title="غياب بدون عذر">🔴 ${person.unexcusedSessions}</span>
                </div>
            </div>

            <!-- Task Status Box -->
            <div class="attendance-box task-box mt-2 w-full p-2">
                <span class="text-xs font-semibold">${person.completedTasks} من ${person.totalTasks} مهام منجزة</span>
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

    document.querySelectorAll('.edit-name-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const personId = e.currentTarget.dataset.id;
            openEditPersonNameModal(personId);
        });
    });

    document.querySelectorAll('.delete-person-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const personId = e.currentTarget.dataset.id;
            const person = cachedPeople.find(p => p.id === personId);
            const confirmed = await showCustomConfirm(`هل أنت متأكد من حذف ${person ? person.name : 'هذا الشخص'} نهائياً؟`);
            if (confirmed) {
                await deletePersonHandler(personId);
            }
        });
    });

    // Clicking avatar or name opens history
    document.querySelectorAll('.person-card .avatar, .person-card h3').forEach(elem => {
        elem.addEventListener('click', (e) => {
            const personId = e.currentTarget.dataset.id;
            openPersonHistoryModal(personId);
        });
    });
}

// Open Person Attendance History Modal
function openPersonHistoryModal(personId) {
    const person = cachedPeople.find(p => p.id === personId);
    if (!person) return;

    const modal = document.getElementById('personHistoryModal');
    const titleEl = document.getElementById('personHistoryTitle');
    const listEl = document.getElementById('personHistoryList');
    if (!modal || !listEl) return;

    if (titleEl) titleEl.innerText = `سجل حضور الخادم: ${person.name} ✝️`;
    listEl.innerHTML = '';

    const sessions = Object.values(cachedAttendanceSessions || {}).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (sessions.length === 0) {
        listEl.innerHTML = '<li class="p-4 text-center text-xs text-gray-400">لا توجد جلسات حضور مسجلة بعد.</li>';
    } else {
        sessions.forEach(sess => {
            const status = sess.records ? sess.records[person.id] : undefined;
            if (status === undefined) return;

            let badgeHtml = '';
            if (status === 'present' || status === 'late') {
                badgeHtml = '<span class="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs">حاضر 🟢</span>';
            } else if (status === 'excused') {
                badgeHtml = '<span class="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-xs">غياب بعذر 🟡</span>';
            } else {
                badgeHtml = '<span class="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-700 dark:text-red-300 font-bold text-xs">غياب بدون عذر 🔴</span>';
            }

            const dayTypeBadge = getDayTypeBadge(sess.dayType);
            const li = document.createElement('li');
            li.className = 'p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-right text-xs';
            li.innerHTML = `
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="font-bold text-sm text-gray-900 dark:text-white">${escapeHTML(sess.title || 'جلسة خدمة')}</span>
                        ${dayTypeBadge}
                    </div>
                    <span class="text-gray-500 font-mono text-[11px]">${escapeHTML(sess.date)}</span>
                </div>
                <div>${badgeHtml}</div>
            `;
            listEl.appendChild(li);
        });

        if (listEl.children.length === 0) {
            listEl.innerHTML = '<li class="p-4 text-center text-xs text-gray-400">لم يتم تسجيل حضور أو غياب لهذا الخادم في أي جلسة حتى الآن.</li>';
        }
    }

    modal.style.display = 'flex';
}

// Open Edit Person Name Modal
let currentEditingPersonId = null;
function openEditPersonNameModal(personId) {
    const person = cachedPeople.find(p => p.id === personId);
    if (!person) return;
    currentEditingPersonId = personId;
    const modal = document.getElementById('editNameModal');
    const input = document.getElementById('editNameInput');
    if (input) input.value = person.name;
    if (modal) modal.style.display = 'flex';
}

// Open Person Visual Analytics Modal
function openPersonAnalyticsModal(personId) {
    const people = calculatePeopleStats(cachedPeople, cachedAttendanceSessions, cachedTasks, cachedEvents);
    const person = people.find(p => p.id === personId);
    if (!person) return;

    const modal = document.getElementById('personAnalyticsModal');
    if (!modal) return;

    const nameEl = document.getElementById('analyticsPersonName');
    if (nameEl) nameEl.innerText = `تحليلات وإحصائيات: ${person.name} ✝️`;

    const metricCommitmentRate = document.getElementById('metricCommitmentRate');
    const metricAttendanceRate = document.getElementById('metricAttendanceRate');
    const metricTotalSessions = document.getElementById('metricTotalSessions');
    const metricCountPresent = document.getElementById('metricCountPresent');
    const metricCountExcused = document.getElementById('metricCountExcused');
    const metricCountAbsent = document.getElementById('metricCountAbsent');
    const metricTotalOverload = document.getElementById('metricTotalOverload');
    const metricTaskRate = document.getElementById('metricTaskRate');

    if (metricCommitmentRate) metricCommitmentRate.innerText = `${(person.commitmentRatio * 100).toFixed(0)}%`;
    if (metricAttendanceRate) metricAttendanceRate.innerText = `${(person.attendanceRatio * 100).toFixed(0)}%`;
    if (metricTotalSessions) metricTotalSessions.innerText = `${person.attendedSessions} من ${person.totalSessions}`;
    if (metricCountPresent) metricCountPresent.innerText = `${person.attendedSessions} 🟢`;
    if (metricCountExcused) metricCountExcused.innerText = `${person.excusedSessions} 🟡`;
    if (metricCountAbsent) metricCountAbsent.innerText = `${person.unexcusedSessions} 🔴`;
    if (metricTotalOverload) metricTotalOverload.innerText = `+${person.totalOverload} نزول`;
    if (metricTaskRate) metricTaskRate.innerText = `${(person.taskRatio * 100).toFixed(0)}% (${person.completedTasks}/${person.totalTasks})`;

    if (typeof Chart !== 'undefined') {
        try {
            const doughnutCanvas = document.getElementById('attendanceDoughnutChart');
            if (doughnutCanvas) {
                if (chartInstances.personAttendance) chartInstances.personAttendance.destroy();
                chartInstances.personAttendance = new Chart(doughnutCanvas, {
                    type: 'doughnut',
                    data: {
                        labels: ['حاضر 🟢', 'غياب بعذر 🟡', 'غياب بدون عذر 🔴'],
                        datasets: [{
                            data: [person.attendedSessions || 0, person.excusedSessions || 0, person.unexcusedSessions || 0],
                            backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom' } }
                    }
                });
            }

            const eventsCanvas = document.getElementById('eventsBarChart');
            if (eventsCanvas) {
                if (chartInstances.personEvents) chartInstances.personEvents.destroy();
                const eventLabels = (cachedEvents || []).map(e => e.name);
                const eventData = (cachedEvents || []).map(ev => {
                    const count = (person.attendance || []).filter(s => s.status && (s.eventId === ev.id || (s.dayName && s.dayName.includes(ev.name)))).length;
                    return count;
                });
                chartInstances.personEvents = new Chart(eventsCanvas, {
                    type: 'bar',
                    data: {
                        labels: eventLabels.length ? eventLabels : ['الهدف الأساسي'],
                        datasets: [{
                            label: 'مرات النزول',
                            data: eventData.length ? eventData : [person.attendedSessions],
                            backgroundColor: '#8b5cf6'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
                    }
                });
            }
        } catch (chartErr) {
            console.warn('Chart render fallback:', chartErr);
        }
    }

    modal.style.display = 'flex';
}

// Global Clear search helper
window.clearPersonSearchAndFocus = () => {
    personCardsSearchQuery = '';
    if (personCardsSearchInput) {
        personCardsSearchInput.value = '';
        personCardsSearchInput.focus();
    }
    renderCardsFromCache();
};

// --- UNIFIED RENDER FOR ALL MODULES (RENDER FOR ALL) ---
function renderForAll() {
    // 1. Strictly guarantee all state arrays & objects are initialized
    if (!Array.isArray(cachedPeople)) cachedPeople = [];
    if (!Array.isArray(cachedTasks)) cachedTasks = [];
    if (!Array.isArray(cachedEvents)) cachedEvents = [];
    if (!cachedAttendanceSessions || typeof cachedAttendanceSessions !== 'object') cachedAttendanceSessions = {};
    if (cachedActivePlan && !Array.isArray(cachedActivePlan.scheduledDays)) {
        cachedActivePlan.scheduledDays = [];
    }

    // 2. Render all core UI views immediately
    renderPlanAndNotebookHero();
    checkAndRenderMissedDays();
    renderCardsFromCache();
    renderDaysList();
    renderTasksList();
    renderEventsList();
    renderAdminInsights();

    // 3. Sync Dynamic Island state if initialized
    if (typeof window.syncDynamicIslandState === 'function') {
        window.syncDynamicIslandState();
    }
}
window.renderForAll = renderForAll;

// --- DATA FETCHING & SYNC ENGINE ---
async function fetchAllData() {
    try {
        // 1. Fetch Plan & Notebook
        try {
            const planRes = await fetch(`${API_URL}/plan`);
            if (planRes.ok) {
                const planData = await planRes.json();
                cachedActivePlan = planData.activePlan || null;
                if (cachedActivePlan && !Array.isArray(cachedActivePlan.scheduledDays)) {
                    cachedActivePlan.scheduledDays = [];
                }
            }
        } catch (e) {
            console.warn('Plan fetch fallback:', e);
        }

        // 2. Fetch Normalized Attendance Sessions
        try {
            const sessRes = await fetch(`${API_URL}/attendance-sessions`);
            if (sessRes.ok) {
                const sessData = await sessRes.json();
                cachedAttendanceSessions = (sessData && sessData.attendanceSessions && typeof sessData.attendanceSessions === 'object') ? sessData.attendanceSessions : {};
            }
        } catch (e) {
            console.warn('Sessions fetch fallback:', e);
        }

        // 3. Fetch People
        try {
            const peopleRes = await fetch(`${API_URL}/people`);
            if (peopleRes.ok) {
                const pData = await peopleRes.json();
                cachedPeople = Array.isArray(pData.people) ? pData.people : [];
            }
        } catch (e) {
            console.warn('People fetch fallback:', e);
        }

        // 4. Fetch Tasks
        try {
            const tasksRes = await fetch(`${API_URL}/tasks`);
            if (tasksRes.ok) {
                const tasksData = await tasksRes.json();
                cachedTasks = Array.isArray(tasksData) ? tasksData : (tasksData?.tasks || []);
            }
        } catch (e) {
            console.warn('Tasks fetch fallback:', e);
        }

        // 5. Fetch Events
        try {
            const eventsRes = await fetch(`${API_URL}/events`);
            if (eventsRes.ok) {
                const eventsData = await eventsRes.json();
                cachedEvents = Array.isArray(eventsData) ? eventsData : (eventsData?.events || []);
            }
        } catch (e) {
            console.warn('Events fetch fallback:', e);
        }

        // Render all elements immediately upon completion of data loading
        renderForAll();

        if (connectionStatusDot) connectionStatusDot.classList.add('online');
        if (connectionStatusText) connectionStatusText.innerText = 'متصل سحابياً ⚡';
    } catch (err) {
        console.error('Error fetching data from API:', err);
        renderForAll();
        if (connectionStatusDot) connectionStatusDot.classList.remove('online');
        if (connectionStatusText) connectionStatusText.innerText = 'سيرفر محلي';
    }
}

// --- ATTENDANCE SESSION SAVING ---
async function saveAttendanceSession(dateStr, titleStr, recordsMap, source = 'plan', linkedEventId = null, dayType = 'meeting') {
    try {
        const payload = {
            date: dateStr,
            title: titleStr,
            source: source,
            linkedEventId: linkedEventId,
            dayType: dayType,
            isCompleted: true,
            records: recordsMap
        };

        const res = await fetch(`${API_URL}/attendance-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const dayTypeLabel = dayType === 'work' ? 'شغل 🛠️' : (dayType === 'meeting_work' ? 'اجتماع وشغل 📖🛠️' : 'اجتماع 📖');
        if (res.ok) {
            cachedAttendanceSessions[dateStr] = payload;
            showToast(`تم تسجيل الحضور ليوم ${dateStr} [${dayTypeLabel}] بنجاح! ✅`);
            renderPlanAndNotebookHero();
            checkAndRenderMissedDays();
            renderCardsFromCache();
            renderDaysList();
            renderEventsList();
            return true;
        } else {
            const err = await res.json();
            showToast(err.message || 'فشل في حفظ الحضور', true);
            return false;
        }
    } catch (e) {
        console.error('Save session error:', e);
        // Local fallback
        cachedAttendanceSessions[dateStr] = {
            date: dateStr,
            title: titleStr,
            source: source,
            linkedEventId: linkedEventId,
            dayType: dayType,
            isCompleted: true,
            records: recordsMap
        };
        const dayTypeLabel = dayType === 'work' ? 'شغل 🛠️' : (dayType === 'meeting_work' ? 'اجتماع وشغل 📖🛠️' : 'اجتماع 📖');
        showToast(`تم الحفظ محلياً ليوم ${dateStr} [${dayTypeLabel}] ⚡`);
        renderPlanAndNotebookHero();
        checkAndRenderMissedDays();
        renderCardsFromCache();
        renderDaysList();
        renderEventsList();
        return true;
    }
}

// --- PERSON MANAGEMENT HANDLERS ---
async function createPersonHandler(name, role, birthdate, notes) {
    try {
        const res = await fetch(`${API_URL}/people`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, role: 'servant', birthdate, notes })
        });
        if (res.ok) {
            const data = await res.json();
            cachedPeople.push(data.person);
            showToast(`تم إضافة الخادم ${data.person.name} بنجاح! ✝️`);
            renderCardsFromCache();
            return true;
        } else {
            const err = await res.json();
            showToast(err.message || 'فشل إضافة الخادم', true);
            return false;
        }
    } catch (e) {
        console.error('Create person error:', e);
        showToast('تعذر الاتصال بالسيرفر', true);
        return false;
    }
}

async function deletePersonHandler(personId) {
    try {
        const res = await fetch(`${API_URL}/people/${personId}`, { method: 'DELETE' });
        if (res.ok) {
            cachedPeople = cachedPeople.filter(p => p.id !== personId);
            showToast('تم حذف الشخص بنجاح');
            renderCardsFromCache();
        }
    } catch (e) {
        showToast('فشل حذف الشخص', true);
    }
}

// --- WHATSAPP PLAN PARSER ---
function parseWhatsAppPlanText(text) {
    if (!text) return [];
    const lines = text.split('\n');
    const parsedDays = [];
    const currentYear = new Date().getFullYear();

    lines.forEach(line => {
        const clean = line.trim();
        if (!clean) return;

        // Match patterns like "10/16", "16-10", "2026-10-16", or Arabic day followed by date e.g. "الجمعة 10/16"
        const dateMatch = clean.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})|(\d{1,2}[-/]\d{1,2})/);
        if (dateMatch) {
            let matchedDateStr = dateMatch[0];
            let isoDate = '';

            if (matchedDateStr.includes('-') && matchedDateStr.length >= 8) {
                isoDate = matchedDateStr;
            } else {
                // e.g. "10/16" -> month 10, day 16
                const parts = matchedDateStr.split(/[-/]/);
                let month = parts[0].padStart(2, '0');
                let day = parts[1].padStart(2, '0');
                // Check if parts[0] > 12 -> day is first
                if (parseInt(parts[0], 10) > 12) {
                    day = parts[0].padStart(2, '0');
                    month = parts[1].padStart(2, '0');
                }
                isoDate = `${currentYear}-${month}-${day}`;
            }

            // Extract title by stripping asterisks and numbers
            let dayTitle = clean
                .replace(/^[0-9]+[️⃣.\-)*\s]+/, '')
                .replace(/\*([^*]+)\*/g, '$1')
                .replace(/^[^\s]+ \d{1,2}[-/]\d{1,2}[:\-]*\s*/, '')
                .trim();

            if (!dayTitle) dayTitle = clean;

            parsedDays.push({
                date: isoDate,
                dayTitle: dayTitle.slice(0, 100),
                details: clean,
                linkedEventId: null
            });
        }
    });

    return parsedDays;
}

// Render dynamic day rows inside planModal
function renderScheduledDaysListInModal(days) {
    if (!scheduledDaysListContainer) return;
    scheduledDaysListContainer.innerHTML = '';
    if (scheduledDaysCount) scheduledDaysCount.innerText = days.length;

    days.forEach((day, index) => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 p-2 rounded-xl bg-white/10 border border-white/10 text-xs';
        row.innerHTML = `
            <input type="date" value="${escapeHTML(day.date)}" class="plan-day-date-input form-input text-xs py-1 px-2 w-32 rounded-lg" data-index="${index}">
            <input type="text" value="${escapeHTML(day.dayTitle)}" placeholder="عنوان اليوم..." class="plan-day-title-input form-input text-xs py-1 px-2 flex-grow rounded-lg" data-index="${index}">
            <button type="button" class="remove-plan-day-btn text-red-500 hover:text-red-700 font-bold px-2 py-1 text-sm cursor-pointer" data-index="${index}" title="حذف">&times;</button>
        `;
        scheduledDaysListContainer.appendChild(row);
    });

    // Attach listeners
    scheduledDaysListContainer.querySelectorAll('.remove-plan-day-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.index, 10);
            days.splice(idx, 1);
            renderScheduledDaysListInModal(days);
        });
    });
}

// --- DAYS & TASKS & EVENTS RENDERERS ---
function renderDaysList() {
    const container = document.getElementById('daysListContainer');
    if (!container) return;
    container.innerHTML = '';

    const sessions = Object.values(cachedAttendanceSessions || {});
    sessions.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sessions.length === 0) {
        const noDays = document.getElementById('noDaysMessage');
        if (noDays) noDays.classList.remove('hidden');
        return;
    }
    const noDays = document.getElementById('noDaysMessage');
    if (noDays) noDays.classList.add('hidden');

    sessions.forEach(sess => {
        const row = document.createElement('div');
        row.className = 'day-item p-4 rounded-2xl liquid-glass mb-3 flex items-center justify-between text-right';

        const recs = sess.records || {};
        const presentCount = Object.values(recs).filter(s => s === 'present' || s === 'late').length;
        const excusedCount = Object.values(recs).filter(s => s === 'excused').length;
        const absentCount = Object.values(recs).filter(s => s === 'absent').length;

        const dayTypeBadge = getDayTypeBadge(sess.dayType);

        row.innerHTML = `
            <div>
                <div class="flex items-center gap-2 mb-1">
                    <h4 class="font-bold text-sm text-gray-900 dark:text-white">${escapeHTML(sess.title || sess.date)}</h4>
                    ${dayTypeBadge}
                </div>
                <span class="text-xs text-gray-500 font-mono">${escapeHTML(sess.date)}</span>
                <div class="flex items-center gap-2 mt-1 text-[11px] font-bold">
                    <span class="text-emerald-600">🟢 ${presentCount} حاضر</span>
                    <span class="text-amber-600">🟡 ${excusedCount} عذر</span>
                    <span class="text-red-600">🔴 ${absentCount} غياب</span>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button type="button" class="open-day-rec-btn px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow cursor-pointer" data-date="${escapeHTML(sess.date)}" data-title="${escapeHTML(sess.title || '')}" data-type="${escapeHTML(sess.dayType || 'meeting')}">
                    تعديل الحضور ✍️
                </button>
            </div>
        `;

        row.querySelector('.open-day-rec-btn').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            openAttendanceModalForDate(btn.dataset.date, btn.dataset.title, sess.linkedEventId, btn.dataset.type);
        });

        container.appendChild(row);
    });
}

function renderTasksList() {
    const container = document.getElementById('tasksListContainer');
    if (!container) return;
    container.innerHTML = '';

    if (cachedTasks.length === 0) {
        const noTasks = document.getElementById('noTasksMessage');
        if (noTasks) noTasks.classList.remove('hidden');
        return;
    }
    const noTasks = document.getElementById('noTasksMessage');
    if (noTasks) noTasks.classList.add('hidden');

    const peopleMap = new Map(cachedPeople.map(p => [p.id, p.name]));

    cachedTasks.forEach(task => {
        const item = document.createElement('div');
        item.className = 'p-4 rounded-2xl liquid-glass mb-3 flex items-center justify-between text-right';
        const assignedName = peopleMap.get(task.personId) || 'شخص محذوف';

        let statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-600">قيد الانتظار ⏳</span>';
        if (task.status === 'completed') statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-600">منجزة ✅</span>';
        else if (task.status === 'in-progress') statusBadge = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-600">قيد التنفيذ 🔄</span>';

        item.innerHTML = `
            <div>
                <h4 class="font-bold text-sm">${escapeHTML(task.description)}</h4>
                <div class="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span>👤 المكلف: <strong>${escapeHTML(assignedName)}</strong></span>
                    <span>📅 الموعد: ${escapeHTML(task.date)}</span>
                    ${statusBadge}
                </div>
            </div>
            <div class="flex items-center gap-1">
                <button type="button" class="toggle-task-btn px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer" data-id="${task.id}" data-status="${task.status}">
                    ${task.status === 'completed' ? 'تراجع ↩️' : 'إنجاز ✅'}
                </button>
            </div>
        `;

        item.querySelector('.toggle-task-btn').addEventListener('click', async () => {
            const newStatus = task.status === 'completed' ? 'pending' : 'completed';
            await fetch(`${API_URL}/tasks/${task.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: task.description,
                    personId: task.personId,
                    date: task.date,
                    status: newStatus
                })
            });
            task.status = newStatus;
            renderTasksList();
            renderCardsFromCache();
        });

        container.appendChild(item);
    });
}

function renderEventsList() {
    const container = document.getElementById('eventsContainer');
    if (!container) return;
    container.innerHTML = '';

    if (cachedEvents.length === 0) {
        const noEvents = document.getElementById('noEventsMessage');
        if (noEvents) noEvents.classList.remove('hidden');
        return;
    }
    const noEvents = document.getElementById('noEventsMessage');
    if (noEvents) noEvents.classList.add('hidden');

    cachedEvents.forEach(ev => {
        const card = document.createElement('div');
        card.className = 'p-5 rounded-2xl liquid-glass text-right flex flex-col justify-between';

        const attendees = ev.attendeesCount || 0;
        const target = ev.targetCount || 2;
        const overloads = ev.totalOverloadCount || 0;

        card.innerHTML = `
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500 text-white">الهدف: ${target} نزول</span>
                    <h3 class="text-base font-bold text-gray-900 dark:text-white">${escapeHTML(ev.name)}</h3>
                </div>
                <p class="text-xs text-gray-500 mb-3">${escapeHTML(ev.description || '')}</p>
                <div class="text-[11px] text-gray-400 mb-3">
                    <span>من ${escapeHTML(ev.startDate)} ${ev.endDate ? `إلى ${escapeHTML(ev.endDate)}` : ''}</span>
                </div>
                <div class="grid grid-cols-3 gap-2 text-center p-2 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 mb-4">
                    <div>
                        <span class="text-[10px] text-gray-400 block">الحاضرون</span>
                        <span class="text-sm font-bold text-blue-600">${attendees}</span>
                    </div>
                    <div>
                        <span class="text-[10px] text-gray-400 block">أكملوا الهدف</span>
                        <span class="text-sm font-bold text-emerald-600">${ev.completedTargetCount || 0}</span>
                    </div>
                    <div>
                        <span class="text-[10px] text-gray-400 block">Overload ⚡</span>
                        <span class="text-sm font-bold text-amber-600">+${overloads}</span>
                    </div>
                </div>
            </div>
            <div class="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button type="button" class="rec-event-session-btn btn-primary text-xs py-1.5 px-3" data-id="${ev.id}" data-name="${escapeHTML(ev.name)}">
                    تسجيل نزول للحدث 🎪
                </button>
            </div>
        `;

        card.querySelector('.rec-event-session-btn').addEventListener('click', () => {
            const todayStr = new Date().toISOString().slice(0, 10);
            openAttendanceModalForDate(todayStr, `${ev.name} - نزول`, ev.id);
        });

        container.appendChild(card);
    });
}

// --- ADMIN INSIGHTS (EXECUTIVE SUMMARY) ---
function renderAdminInsights() {
    const people = calculatePeopleStats(cachedPeople, cachedAttendanceSessions, cachedTasks, cachedEvents);
    if (people.length === 0) return;

    const totalPeople = people.length;
    const avgCommitment = people.reduce((acc, p) => acc + p.commitmentRatio, 0) / (totalPeople || 1);
    const urgentCount = people.filter(p => p.needsFollowUp).length;
    const totalUnexcused = people.reduce((acc, p) => acc + p.unexcusedSessions, 0);
    const totalExcused = people.reduce((acc, p) => acc + p.excusedSessions, 0);
    const perfectCount = people.filter(p => p.commitmentRatio === 1 && p.totalSessions > 0).length;

    const kpiTotalPeople = document.getElementById('kpiTotalPeople');
    const kpiAvgCommitment = document.getElementById('kpiAvgCommitment');
    const kpiUrgentFollowup = document.getElementById('kpiUrgentFollowup');
    const kpiTotalUnexcused = document.getElementById('kpiTotalUnexcused');
    const kpiTotalExcused = document.getElementById('kpiTotalExcused');
    const kpiPerfectPeople = document.getElementById('kpiPerfectPeople');

    if (kpiTotalPeople) kpiTotalPeople.innerText = totalPeople;
    if (kpiAvgCommitment) kpiAvgCommitment.innerText = `${(avgCommitment * 100).toFixed(0)}%`;
    if (kpiUrgentFollowup) kpiUrgentFollowup.innerText = urgentCount;
    if (kpiTotalUnexcused) kpiTotalUnexcused.innerText = totalUnexcused;
    if (kpiTotalExcused) kpiTotalExcused.innerText = totalExcused;
    if (kpiPerfectPeople) kpiPerfectPeople.innerText = perfectCount;

    renderAdminQuestionResults(currentAdminQuestion);
}

function renderAdminQuestionResults(qKey) {
    const list = document.getElementById('insightsResultsList');
    if (!list) return;
    list.innerHTML = '';

    const people = calculatePeopleStats(cachedPeople, cachedAttendanceSessions, cachedTasks, cachedEvents);
    let targetList = [];

    if (qKey === 'unexcused') {
        targetList = [...people].sort((a, b) => b.unexcusedSessions - a.unexcusedSessions).filter(p => p.unexcusedSessions > 0);
    } else if (qKey === 'followup') {
        targetList = people.filter(p => p.needsFollowUp);
    } else if (qKey === 'excused') {
        targetList = [...people].sort((a, b) => b.excusedSessions - a.excusedSessions).filter(p => p.excusedSessions > 0);
    } else if (qKey === 'honors') {
        targetList = [...people].sort((a, b) => b.commitmentRatio - a.commitmentRatio).filter(p => p.commitmentRatio >= 0.9 && p.totalSessions > 0);
    } else if (qKey === 'overload') {
        targetList = [...people].sort((a, b) => b.totalOverload - a.totalOverload).filter(p => p.totalOverload > 0);
    }

    if (targetList.length === 0) {
        list.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">لا توجد حالات مسجلة في هذا التصنيف حتى الآن.</p>';
        return;
    }

    targetList.slice(0, 10).forEach(p => {
        const item = document.createElement('div');
        item.className = 'p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs text-right';

        item.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="font-bold text-gray-900 dark:text-white">${escapeHTML(p.name)}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">خادم ✝️</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="font-bold text-amber-600 dark:text-amber-400">${(p.commitmentRatio * 100).toFixed(0)}% التزام</span>
            </div>
        `;
        list.appendChild(item);
    });
}

// --- INIT EVENT LISTENERS ---
function initEventListeners() {
    // Role filter tabs
    document.querySelectorAll('.role-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.role-filter-btn').forEach(b => {
                b.classList.remove('active', 'bg-amber-600', 'text-white', 'shadow-sm');
                b.classList.add('text-gray-700', 'dark:text-gray-200');
            });
            e.currentTarget.classList.add('active', 'bg-amber-600', 'text-white', 'shadow-sm');
            e.currentTarget.classList.remove('text-gray-700', 'dark:text-gray-200');
            currentRoleFilter = e.currentTarget.dataset.role;
            renderCardsFromCache();
        });
    });

    // Realtime search
    if (personCardsSearchInput) {
        personCardsSearchInput.addEventListener('input', (e) => {
            personCardsSearchQuery = e.target.value;
            renderCardsFromCache();
        });
    }

    if (clearPersonCardsSearchBtn) {
        clearPersonCardsSearchBtn.addEventListener('click', () => {
            window.clearPersonSearchAndFocus();
        });
    }

    // Copy Plan Text
    if (copyPlanWhatsAppBtn) {
        copyPlanWhatsAppBtn.addEventListener('click', () => {
            if (!cachedActivePlan || !cachedActivePlan.rawWhatsAppText) {
                showToast('لا توجد خطة مسجلة بعد للنسخ', true);
                return;
            }
            navigator.clipboard.writeText(cachedActivePlan.rawWhatsAppText).then(() => {
                showToast('تم نسخ نص الخطة إلى الحافظة بنجاح! 📋');
            }).catch(() => {
                showToast('تعذر النسخ التلقائي، يمكنك نسخ النص يدوياً', true);
            });
        });
    }

    // Open Plan Editor Modal
    let modalWorkingDays = [];
    if (openEditPlanModalBtn) {
        openEditPlanModalBtn.addEventListener('click', () => {
            if (cachedActivePlan) {
                if (planTitleInput) planTitleInput.value = cachedActivePlan.title || '';
                if (planStartDateInput) planStartDateInput.value = cachedActivePlan.startDate || '';
                if (planEndDateInput) planEndDateInput.value = cachedActivePlan.endDate || '';
                if (planRawTextInput) planRawTextInput.value = cachedActivePlan.rawWhatsAppText || '';
                modalWorkingDays = JSON.parse(JSON.stringify(cachedActivePlan.scheduledDays || []));
                renderScheduledDaysListInModal(modalWorkingDays);
            }
            if (planModal) planModal.style.display = 'flex';
        });
    }

    if (closePlanModalXBtn) closePlanModalXBtn.addEventListener('click', () => planModal.style.display = 'none');
    if (cancelPlanModalBtn) cancelPlanModalBtn.addEventListener('click', () => planModal.style.display = 'none');

    // Auto Parse Plan Button
    if (parseWhatsAppPlanBtn) {
        parseWhatsAppPlanBtn.addEventListener('click', () => {
            const raw = planRawTextInput ? planRawTextInput.value : '';
            if (!raw.trim()) {
                showToast('يرجى إدخال أو لصق نص الخطة أولاً في الحقل', true);
                return;
            }
            const parsed = parseWhatsAppPlanText(raw);
            if (parsed.length === 0) {
                showToast('لم يتم العثور على تواريخ واضحة، يمكنك إضافة الأيام يدوياً بالزر أدناه', true);
            } else {
                modalWorkingDays = parsed;
                renderScheduledDaysListInModal(modalWorkingDays);
                showToast(`تم استخراج ${parsed.length} أيام بنجاح من الرسالة! ⚡`);
            }
        });
    }

    if (addNewScheduledDayBtn) {
        addNewScheduledDayBtn.addEventListener('click', () => {
            const todayStr = new Date().toISOString().slice(0, 10);
            modalWorkingDays.push({
                date: todayStr,
                dayTitle: 'موضوع الاجتماع / الورشة',
                details: '',
                linkedEventId: null
            });
            renderScheduledDaysListInModal(modalWorkingDays);
        });
    }

    // Save Plan Modal
    if (savePlanModalBtn) {
        savePlanModalBtn.addEventListener('click', async () => {
            // Read inputs from modal
            const updatedDays = [];
            const rows = scheduledDaysListContainer.querySelectorAll('.flex.items-center');
            rows.forEach(r => {
                const dateVal = r.querySelector('.plan-day-date-input').value;
                const titleVal = r.querySelector('.plan-day-title-input').value;
                if (dateVal) {
                    updatedDays.push({
                        date: dateVal,
                        dayTitle: titleVal || 'يوم بالخطة',
                        details: '',
                        linkedEventId: null
                    });
                }
            });

            const payload = {
                title: planTitleInput?.value || 'الخطة الأسبوعية',
                startDate: planStartDateInput?.value || '',
                endDate: planEndDateInput?.value || '',
                rawWhatsAppText: planRawTextInput?.value || '',
                scheduledDays: updatedDays
            };

            const res = await fetch(`${API_URL}/plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                cachedActivePlan = data.activePlan;
                showToast('تم حفظ واعتماد الخطة بنجاح! 💾');
                planModal.style.display = 'none';
                renderPlanAndNotebookHero();
                checkAndRenderMissedDays();
            } else {
                showToast('حدث خطأ أثناء حفظ الخطة', true);
            }
        });
    }

    // Extra Day Modal
    if (openExtraDayModalBtn) {
        openExtraDayModalBtn.addEventListener('click', () => {
            const todayStr = new Date().toISOString().slice(0, 10);
            if (extraDayDateInput) extraDayDateInput.value = todayStr;
            if (extraDayTitleInput) extraDayTitleInput.value = '';
            if (extraDayModal) extraDayModal.style.display = 'flex';
        });
    }

    if (closeExtraDayXBtn) closeExtraDayXBtn.addEventListener('click', () => extraDayModal.style.display = 'none');
    if (cancelExtraDayBtn) cancelExtraDayBtn.addEventListener('click', () => extraDayModal.style.display = 'none');

    if (confirmExtraDayBtn) {
        confirmExtraDayBtn.addEventListener('click', () => {
            const dateVal = extraDayDateInput?.value;
            const titleVal = extraDayTitleInput?.value || 'يوم إضافي (خارج الخطة)';
            const dayTypeVal = document.getElementById('extraDayTypeSelect')?.value || 'meeting';
            if (!dateVal) {
                showToast('يرجى اختيار التاريخ', true);
                return;
            }
            extraDayModal.style.display = 'none';
            openAttendanceModalForDate(dateVal, titleVal, null, dayTypeVal);
        });
    }

    // Quick Add Person from input
    if (addPersonBtn) {
        addPersonBtn.addEventListener('click', async () => {
            const name = personNameInput ? personNameInput.value.trim() : '';
            if (!name) {
                showToast('يرجى إدخال اسم الخادم أولاً', true);
                return;
            }
            const success = await createPersonHandler(name, 'servant', '', '');
            if (success && personNameInput) personNameInput.value = '';
        });
    }

    // Add Person Modal
    if (openAddPersonModalBtn) {
        openAddPersonModalBtn.addEventListener('click', () => {
            if (newPersonFullNameInput) newPersonFullNameInput.value = '';
            if (newPersonBirthdateInput) newPersonBirthdateInput.value = '';
            if (newPersonNotesInput) newPersonNotesInput.value = '';
            if (addPersonModal) addPersonModal.style.display = 'flex';
        });
    }

    if (closeAddPersonModalXBtn) closeAddPersonModalXBtn.addEventListener('click', () => addPersonModal.style.display = 'none');
    if (cancelAddPersonBtn) cancelAddPersonBtn.addEventListener('click', () => addPersonModal.style.display = 'none');

    if (confirmAddPersonBtn) {
        confirmAddPersonBtn.addEventListener('click', async () => {
            const name = newPersonFullNameInput ? newPersonFullNameInput.value.trim() : '';
            if (!name) {
                showToast('الاسم الكامل مطلوب', true);
                return;
            }
            const role = 'servant';
            const birthdate = newPersonBirthdateInput ? newPersonBirthdateInput.value : '';
            const notes = newPersonNotesInput ? newPersonNotesInput.value.trim() : '';

            const success = await createPersonHandler(name, role, birthdate, notes);
            if (success) {
                addPersonModal.style.display = 'none';
            }
        });
    }

    // Edit Person Name Modal wiring
    const editNameSaveBtn = document.getElementById('editNameSaveBtn');
    const editNameCancelBtn = document.getElementById('editNameCancelBtn');
    const editNameInput = document.getElementById('editNameInput');
    const editNameModal = document.getElementById('editNameModal');
    if (editNameCancelBtn) editNameCancelBtn.addEventListener('click', () => { if (editNameModal) editNameModal.style.display = 'none'; });
    if (editNameSaveBtn) {
        editNameSaveBtn.addEventListener('click', async () => {
            const newName = editNameInput?.value?.trim();
            if (!newName) {
                showToast('يرجى إدخال اسم صحيح', true);
                return;
            }
            if (currentEditingPersonId) {
                try {
                    const res = await fetch(`${API_URL}/people/${currentEditingPersonId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: newName, role: 'servant' })
                    });
                    if (res.ok) {
                        const updated = await res.json();
                        const p = cachedPeople.find(x => x.id === currentEditingPersonId);
                        if (p) p.name = updated.name || newName;
                        showToast('تم تحديث اسم الخادم بنجاح ✅');
                        if (editNameModal) editNameModal.style.display = 'none';
                        renderCardsFromCache();
                    } else {
                        showToast('فشل تحديث الاسم', true);
                    }
                } catch(e) {
                    showToast('تعذر الاتصال بالسيرفر', true);
                }
            }
        });
    }

    // Person History Modal wiring
    const closePersonHistoryXBtn = document.getElementById('closePersonHistoryXBtn');
    const closePersonHistoryBtn = document.getElementById('closePersonHistoryBtn');
    const personHistoryModal = document.getElementById('personHistoryModal');
    if (closePersonHistoryXBtn) closePersonHistoryXBtn.addEventListener('click', () => { if (personHistoryModal) personHistoryModal.style.display = 'none'; });
    if (closePersonHistoryBtn) closePersonHistoryBtn.addEventListener('click', () => { if (personHistoryModal) personHistoryModal.style.display = 'none'; });

    // Person Analytics Modal wiring
    const closeAnalyticsBtn = document.getElementById('closeAnalyticsBtn');
    const closeAnalyticsOkBtn = document.getElementById('closeAnalyticsOkBtn');
    const personAnalyticsModal = document.getElementById('personAnalyticsModal');
    if (closeAnalyticsBtn) closeAnalyticsBtn.addEventListener('click', () => { if (personAnalyticsModal) personAnalyticsModal.style.display = 'none'; });
    if (closeAnalyticsOkBtn) closeAnalyticsOkBtn.addEventListener('click', () => { if (personAnalyticsModal) personAnalyticsModal.style.display = 'none'; });

    // Quick Add Attendance Modal Confirm
    if (quickAddConfirmBtn) {
        quickAddConfirmBtn.addEventListener('click', async () => {
            const dateStr = quickAddDateInput?.value;
            const titleStr = dayNameInput?.value || `جلسة حضور ${dateStr}`;
            const dayTypeStr = document.getElementById('quickAddDayTypeSelect')?.value || 'meeting';
            if (!dateStr) {
                showToast('يرجى تحديد تاريخ الجلسة', true);
                return;
            }

            const recordsMap = {};
            const rows = quickAddList.querySelectorAll('.quick-add-person-row');
            rows.forEach(row => {
                const pId = row.dataset.personId;
                const checkedRadio = row.querySelector(`input[name="status_${pId}"]:checked`);
                recordsMap[pId] = checkedRadio ? checkedRadio.value : 'present';
            });

            const success = await saveAttendanceSession(dateStr, titleStr, recordsMap, 'manual_session', null, dayTypeStr);
            if (success && quickAddModal) {
                quickAddModal.style.display = 'none';
            }
        });
    }

    if (quickAddCloseXBtn) quickAddCloseXBtn.addEventListener('click', () => quickAddModal.style.display = 'none');
    if (quickAddCancelBtn) quickAddCancelBtn.addEventListener('click', () => quickAddModal.style.display = 'none');

    // Mark all present / absent in quick add
    if (markAllPresentBtn) {
        markAllPresentBtn.addEventListener('click', () => {
            quickAddList.querySelectorAll('input[value="present"]').forEach(r => r.checked = true);
        });
    }
    if (markAllAbsentBtn) {
        markAllAbsentBtn.addEventListener('click', () => {
            quickAddList.querySelectorAll('input[value="absent"]').forEach(r => r.checked = true);
        });
    }

    // Quick add filter search
    if (quickAddSearchInput) {
        quickAddSearchInput.addEventListener('input', () => {
            const dateStr = quickAddDateInput?.value || new Date().toISOString().slice(0, 10);
            renderQuickAddListForDate(dateStr);
        });
    }

    // Quick Add Session button in toolbar
    if (quickAddBtn) {
        quickAddBtn.addEventListener('click', () => {
            const todayStr = new Date().toISOString().slice(0, 10);
            openAttendanceModalForDate(todayStr, 'اجتماع خدمة وسائل الإيضاح');
        });
    }

    // Theme toggle
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            if (sunIcon && moonIcon) {
                sunIcon.classList.toggle('hidden', !isDark);
                moonIcon.classList.toggle('hidden', isDark);
            }
        });
    }

    // Scroll back to top
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    window.addEventListener('scroll', () => {
        if (!scrollToTopBtn) return;
        if (window.scrollY > 200) {
            scrollToTopBtn.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-6');
            scrollToTopBtn.classList.add('opacity-100', 'pointer-events-auto', 'translate-y-0');
        } else {
            scrollToTopBtn.classList.add('opacity-0', 'pointer-events-none', 'translate-y-6');
            scrollToTopBtn.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0');
        }
    }, { passive: true });

    if (scrollToTopBtn) {
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Modal dismiss on backdrop click
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
}

// --- BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', async () => {
    // Theme setup
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        if (sunIcon && moonIcon) {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        }
    }

    initEventListeners();
    initAndSyncDynamicIsland();
    renderForAll();
    await fetchAllData();
});

// ==========================================================================
// 60FPS DYNAMIC ISLAND CONTROLLER (SINGLE-LINE GLOWING POP-UP & HEADER HIDE)
// ==========================================================================
function initAndSyncDynamicIsland() {
    const island = document.getElementById('dynamic-island-wrapper');
    const mainHeader = document.getElementById('mainAppHeader');
    if (!island) return;

    const missedBadge = document.getElementById('islandMissedDaysBadge');
    const searchBtn = document.getElementById('islandSearchBtn');
    const copyPlanBtn = document.getElementById('islandCopyPlanBtn');
    const scrollTopBtn = document.getElementById('islandScrollTopBtn');
    const logoBadge = document.getElementById('islandLogoBadge');

    // 1. Smooth 60fps Scroll Trigger (Hide Big Header, Pop Up Glowing Island)
    let scrollRafId = null;
    window.addEventListener('scroll', () => {
        if (scrollRafId !== null) return;
        scrollRafId = window.requestAnimationFrame(() => {
            const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
            if (scrollY > 180) {
                if (mainHeader) mainHeader.classList.add('header-hidden');
                island.classList.add('island-visible');
            } else {
                if (mainHeader) mainHeader.classList.remove('header-hidden');
                island.classList.remove('island-visible');
            }
            scrollRafId = null;
        });
    }, { passive: true });

    // 2. Action: Click Missed Days Badge to directly record attendance
    if (missedBadge) {
        missedBadge.addEventListener('click', (e) => {
            e.stopPropagation();
            const todayStr = new Date().toISOString().slice(0, 10);
            const scheduledDays = Array.isArray(cachedActivePlan?.scheduledDays) ? cachedActivePlan.scheduledDays : [];
            const missedDays = scheduledDays.filter(day => {
                if (day.date > todayStr) return false;
                const session = cachedAttendanceSessions[day.date];
                return !session || !session.isCompleted;
            });
            if (missedDays.length > 0) {
                const targetDay = missedDays[0];
                openAttendanceModalForDate(targetDay.date, targetDay.dayTitle || 'غياب بالخطة', targetDay.linkedEventId);
            } else {
                showToast('ممتاز! جميع أيام الخطة حتى اليوم مسجلة بنجاح ✅');
            }
        });
    }

    // 3. Action: Quick Search Focus
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const searchInput = document.getElementById('personCardsSearchInput');
            if (searchInput) {
                searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    searchInput.focus();
                    searchInput.select?.();
                }, 300);
            }
        });
    }

    // 4. Action: Direct Copy Plan
    if (copyPlanBtn) {
        copyPlanBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const rawPlan = cachedActivePlan?.rawWhatsAppText;
            if (rawPlan && rawPlan.trim()) {
                navigator.clipboard.writeText(rawPlan).then(() => {
                    showToast('تم نسخ نص الخطة إلى الحافظة بنجاح! 📋');
                }).catch(() => {
                    showToast('تعذر النسخ التلقائي للخطة', true);
                });
            } else {
                showToast('لا توجد خطة مسجلة بعد للنسخ', true);
            }
        });
    }

    // 5. Action: Scroll to Top (Unhides big header)
    function scrollToTopAction() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (scrollTopBtn) scrollTopBtn.addEventListener('click', scrollToTopAction);
    if (logoBadge) logoBadge.addEventListener('click', scrollToTopAction);

    // 6. Live Reactive Sync with Existing Global State
    window.syncDynamicIslandState = function() {
        const titleEl = document.getElementById('islandPlanTitle');
        const missedText = document.getElementById('islandMissedDaysText');
        const missedBadgeEl = document.getElementById('islandMissedDaysBadge');
        const statusDot = document.getElementById('islandStatusDot');
        const attendText = document.getElementById('islandAttendanceText');
        const peopleText = document.getElementById('islandPeopleText');

        // A. Title
        const planTitle = cachedActivePlan?.title || 'أسرة الأنبا أرسانيوس';
        if (titleEl) titleEl.innerText = planTitle;

        // B. Missed Days Detection
        const todayStr = new Date().toISOString().slice(0, 10);
        const scheduledDays = Array.isArray(cachedActivePlan?.scheduledDays) ? cachedActivePlan.scheduledDays : [];
        const missedDays = scheduledDays.filter(day => {
            if (day.date > todayStr) return false;
            const session = cachedAttendanceSessions[day.date];
            return !session || !session.isCompleted;
        });

        const missedCount = missedDays.length;
        if (missedText) {
            missedText.innerText = missedCount > 0 ? `${missedCount} معلق` : 'الكل مسجل ✅';
        }
        if (missedBadgeEl) {
            if (missedCount > 0) {
                missedBadgeEl.className = 'island-chip px-2.5 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 transition-all cursor-pointer';
                missedBadgeEl.title = `يوجد ${missedCount} أيام معلقة بالخطة - اضغط لتسجيل الحضور الفوري`;
            } else {
                missedBadgeEl.className = 'island-chip px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition-all';
                missedBadgeEl.title = 'جميع أيام الخطة حتى اليوم مسجلة بنجاح';
            }
        }

        // Status Dot: Amber if missed days, Green if all recorded
        if (statusDot) {
            if (missedCount > 0) {
                statusDot.className = 'island-status-pulse amber';
                statusDot.title = `تنبيه: يوجد ${missedCount} أيام معلقة بالخطة`;
            } else {
                statusDot.className = 'island-status-pulse green';
                statusDot.title = 'ممتاز: جميع أيام الخطة مسجلة بنجاح';
            }
        }

        // C. General Attendance Ratio
        let overallAttendancePct = 0;
        try {
            const stats = calculatePeopleStats(cachedPeople, cachedAttendanceSessions, cachedTasks, cachedEvents);
            if (stats.length > 0) {
                const totalRatioSum = stats.reduce((acc, p) => acc + (p.attendanceRatio || 0), 0);
                overallAttendancePct = Math.round((totalRatioSum / stats.length) * 100);
            }
        } catch (err) {
            overallAttendancePct = 0;
        }
        if (attendText) attendText.innerText = `${overallAttendancePct}%`;

        // D. Total People Count
        if (peopleText) peopleText.innerText = `${cachedPeople.length} فرد`;
    };

    // Transparent Hooks into Existing Render Functions
    if (typeof renderPlanAndNotebookHero === 'function') {
        const originalRenderPlan = renderPlanAndNotebookHero;
        renderPlanAndNotebookHero = function(...args) {
            const res = originalRenderPlan.apply(this, args);
            window.syncDynamicIslandState();
            return res;
        };
    }

    if (typeof checkAndRenderMissedDays === 'function') {
        const originalCheckMissed = checkAndRenderMissedDays;
        checkAndRenderMissedDays = function(...args) {
            const res = originalCheckMissed.apply(this, args);
            window.syncDynamicIslandState();
            return res;
        };
    }

    if (typeof renderCardsFromCache === 'function') {
        const originalRenderCards = renderCardsFromCache;
        renderCardsFromCache = function(...args) {
            const res = originalRenderCards.apply(this, args);
            window.syncDynamicIslandState();
            return res;
        };
    }

    // Initial sync
    window.syncDynamicIslandState();
}

