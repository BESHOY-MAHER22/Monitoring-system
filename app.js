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

// Format Phone for Direct WhatsApp Link with Egypt Code (+20)
function formatWhatsAppUrl(rawPhone) {
    if (!rawPhone) return null;
    let clean = String(rawPhone).replace(/\D/g, '');
    if (clean.startsWith('0')) {
        clean = '2' + clean;
    } else if (!clean.startsWith('20') && clean.length === 10) {
        clean = '20' + clean;
    }
    return `https://wa.me/${clean}`;
}

// Format WhatsApp Raw Text to HTML with Bold & Emojis preserved
function formatWhatsAppToHTML(text) {
    if (!text) return '<span class="text-gray-400">لا يوجد نص للخطة حتى الآن. اضغط على "تعديل الخطة" للصق رسالة الواتساب.</span>';
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
const newPersonPhoneInput = document.getElementById('newPersonPhoneInput');
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
            role: person.role || 'member',
            phone: person.phone || '',
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
    const isEn = currentLanguage === 'en';

    if (!cachedActivePlan) {
        if (planHeroTitle) planHeroTitle.innerText = isEn ? 'Service Plan (WhatsApp)' : 'خطة الخدمة (رسائل واتساب)';
        if (planHeroDates) planHeroDates.innerText = isEn ? 'No active plan' : 'لا توجد خطة نشطة حالياً';
        if (planWhatsAppFormattedText) {
            planWhatsAppFormattedText.innerHTML = `
                <div class="text-center py-6 px-4">
                    <span class="text-3xl block mb-2">📋</span>
                    <p class="text-xs text-gray-600 dark:text-gray-300 mb-3 font-semibold">
                        ${isEn ? 'No active plan recorded yet. Paste your WhatsApp message to auto-parse scheduled days!' : 'لا توجد خطة مسجلة حالياً. الصق رسالة الواتساب الخاصة بالخطة لاستخراج الأيام وجلسات الحضور تلقائياً.'}
                    </p>
                    <button type="button" onclick="document.getElementById('openEditPlanModalBtn').click()" class="btn-primary text-xs py-2 px-4 cursor-pointer shadow-md inline-flex items-center gap-1.5">
                        <span>🎨</span>
                        <span>${isEn ? 'Paste & Setup Plan' : 'لصق وإعداد الخطة'}</span>
                    </button>
                </div>
            `;
        }
        if (planScheduledDaysPillsContainer) planScheduledDaysPillsContainer.innerHTML = '';
        if (notebookHeroTitle) notebookHeroTitle.innerText = isEn ? 'Notebook Summary' : 'خلاصة آخر صفحة في الكشكول';
        if (notebookHeroContent) {
            notebookHeroContent.innerText = isEn 
                ? 'No notebook summary saved yet. Click "Quick Edit" to record closing recommendations.' 
                : 'لا توجد ملاحظات بالكشكول مسجلة حتى الآن. اضغط على "تعديل سريع" لكتابة التوصيات والملاحظات.';
        }
        if (notebookHeroUpdated) notebookHeroUpdated.innerText = '';
        return;
    }

    if (planHeroTitle) planHeroTitle.innerText = cachedActivePlan.title || (isEn ? 'Service Plan' : 'خطة خدمة وسائل الإيضاح');
    if (planHeroDates) {
        if (cachedActivePlan.startDate && cachedActivePlan.endDate) {
            planHeroDates.innerText = isEn 
                ? `From ${cachedActivePlan.startDate} to ${cachedActivePlan.endDate}`
                : `من ${cachedActivePlan.startDate} إلى ${cachedActivePlan.endDate}`;
        } else {
            planHeroDates.innerText = '';
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
                statusLabel = isEn ? 'Attendance recorded' : 'تم تسجيل الحضور';
            } else if (isPastOrToday) {
                pillStyle = 'bg-rose-500/20 text-rose-800 dark:text-rose-200 border-rose-500/40 hover:bg-rose-500/30 animate-pulse';
                statusIcon = '⏳';
                statusLabel = isEn ? 'Attendance pending (click)' : 'لم يُسجل الغياب (اضغط للتسجيل)';
            } else {
                pillStyle = 'bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/30 hover:bg-blue-500/25';
                statusIcon = '📅';
                statusLabel = isEn ? 'Upcoming day' : 'يوم قادم';
            }

            const pill = document.createElement('button');
            pill.type = 'button';
            pill.className = `plan-day-pill px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm ${pillStyle}`;
            pill.setAttribute('title', `${day.dayTitle || (isEn ? 'Scheduled Day' : 'يوم بالخطة')} - ${statusLabel}`);
            pill.innerHTML = `
                <span>${statusIcon}</span>
                <span>${escapeHTML(day.date)}: ${escapeHTML(day.dayTitle || (isEn ? 'Plan Day' : 'يوم بالخطة'))}</span>
            `;

            pill.addEventListener('click', () => {
                openAttendanceModalForDate(day.date, day.dayTitle, day.linkedEventId);
            });

            planScheduledDaysPillsContainer.appendChild(pill);
        });
    }

    // Render Notebook Last Page
    const notebook = cachedActivePlan.notebookLastPage;
    if (notebook) {
        if (notebookHeroTitle) notebookHeroTitle.innerText = notebook.title || (isEn ? 'Notebook Summary' : 'خلاصة وتوصيات الخدمة');
        if (notebookHeroContent) {
            notebookHeroContent.innerText = notebook.content || (isEn ? 'No notes recorded.' : 'لا توجد ملاحظات مسجلة حتى الآن.');
        }
        if (notebookHeroUpdated && notebook.updatedAt) {
            const dateObj = new Date(notebook.updatedAt);
            notebookHeroUpdated.innerText = isEn 
                ? `Updated: ${dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`
                : `آخر تحديث: ${dateObj.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}`;
        }
    }
}

// --- 2. MISSED-DAYS AUTO DETECTOR ---
function checkAndRenderMissedDays() {
    if (!cachedActivePlan || !Array.isArray(cachedActivePlan.scheduledDays) || cachedActivePlan.scheduledDays.length === 0) {
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
function openAttendanceModalForDate(targetDate, targetTitle = '', linkedEventId = null) {
    if (quickAddDateInput) quickAddDateInput.value = targetDate;
    if (dayNameInput) dayNameInput.value = targetTitle || `جلسة حضور ${targetDate}`;
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
        const roleBadge = person.role === 'servant' 
            ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-600 font-bold">خادم</span>'
            : '<span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-500 font-bold">مخدوم</span>';

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

    const isEn = currentLanguage === 'en';
    const allPeopleWithStats = calculatePeopleStats(cachedPeople, cachedAttendanceSessions, cachedTasks, cachedEvents);

    if (allPeopleWithStats.length === 0) {
        if (noDataMessage) noDataMessage.classList.add('hidden');
        if (personSearchResultsCount) personSearchResultsCount.innerText = isEn ? '0 People' : '0 شخص';
        personCardsContainer.innerHTML = `
            <div class="col-span-full p-8 sm:p-12 text-center rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-lg">
                <span class="text-4xl sm:text-5xl block mb-3 animate-bounce">👤✨</span>
                <h3 class="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">
                    ${isEn ? 'No people registered yet' : 'لا توجد بيانات مسجلة حالياً'}
                </h3>
                <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-md mx-auto">
                    ${isEn ? 'All old and test data has been cleared successfully. Start fresh by adding your first servants and members!' : 'تم مسح كافة البيانات القديمة والتجريبية بنجاح. يمكنك الآن البدء بإضافة الخدام والمخدومين الجدد.'}
                </p>
                <div class="flex justify-center gap-3">
                    <button type="button" id="emptyStateAddPersonBtn" class="btn-primary text-xs sm:text-sm py-2.5 px-5 cursor-pointer shadow-lg inline-flex items-center gap-2">
                        <span>➕</span>
                        <span>${isEn ? 'Add New Person' : 'إضافة فرد جديد'}</span>
                    </button>
                </div>
            </div>
        `;
        const emptyBtn = document.getElementById('emptyStateAddPersonBtn');
        if (emptyBtn) emptyBtn.addEventListener('click', () => {
            if (openAddPersonModalBtn) openAddPersonModalBtn.click();
        });
        return;
    }
    if (noDataMessage) noDataMessage.classList.add('hidden');

    // Filter by query (Name or Phone number)
    const query = (personCardsSearchQuery || '').trim().toLowerCase();
    const filteredPeople = allPeopleWithStats.filter(person => {
        // Role Filter Check
        if (currentRoleFilter === 'servants' && person.role !== 'servant') return false;
        if (currentRoleFilter === 'members' && person.role === 'servant') return false;

        if (!query) return true;
        const nameMatch = (person.name || '').toLowerCase().includes(query);
        const phoneMatch = (person.phone || '').includes(query);
        return nameMatch || phoneMatch;
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
                <p class="text-xs text-gray-500">تأكد من كتابة الاسم أو رقم الهاتف بصورة صحيحة.</p>
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
        const isServant = person.role === 'servant';

        // Progress bar color gradient
        let progressColor = 'linear-gradient(90deg, #10b981, #059669)';
        if (person.commitmentRatio < 0.5) {
            progressColor = 'linear-gradient(90deg, #ef4444, #dc2626)';
        } else if (person.commitmentRatio < 0.8) {
            progressColor = 'linear-gradient(90deg, #f59e0b, #d97706)';
        }

        const whatsAppUrl = formatWhatsAppUrl(person.phone);
        const phoneCallUrl = person.phone ? `tel:${person.phone}` : null;

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
            
            <div class="flex items-center gap-1.5 mt-1">
                <h3 class="text-xl font-bold cursor-pointer" data-id="${escapeHTML(person.id)}">${safeRawName}</h3>
                ${isServant 
                    ? '<span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500 text-white shadow-sm">خادم ✝️</span>' 
                    : '<span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-600 text-white shadow-sm">مخدوم 🎒</span>'}
            </div>

            ${person.phone ? `
            <span class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono" dir="ltr">${escapeHTML(person.phone)}</span>` : ''}

            <!-- 1-Click WhatsApp & Phone Actions -->
            <div class="flex items-center gap-2 mt-2 w-full justify-center">
                ${whatsAppUrl ? `
                <a href="${whatsAppUrl}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition flex items-center gap-1 shadow-sm">
                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.187-2.59-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.303-.058.116-.087.188-.173.289l-.26.303c-.087.087-.177.182-.076.355.101.173.449.741.964 1.2.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z"/></svg>
                    <span>واتساب</span>
                </a>` : ''}

                ${phoneCallUrl ? `
                <a href="${phoneCallUrl}" class="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition flex items-center gap-1 shadow-sm">
                    <span>اتصال 📞</span>
                </a>` : ''}
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

// Global Clear search helper
window.clearPersonSearchAndFocus = () => {
    personCardsSearchQuery = '';
    if (personCardsSearchInput) {
        personCardsSearchInput.value = '';
        personCardsSearchInput.focus();
    }
    renderCardsFromCache();
};

// --- DATA FETCHING & SYNC ENGINE ---
async function fetchAllData() {
    try {
        // 1. Fetch Plan & Notebook
        const planRes = await fetch(`${API_URL}/plan`);
        if (planRes.ok) {
            const planData = await planRes.json();
            cachedActivePlan = planData.activePlan;
        }

        // 2. Fetch Normalized Attendance Sessions
        const sessRes = await fetch(`${API_URL}/attendance-sessions`);
        if (sessRes.ok) {
            const sessData = await sessRes.json();
            cachedAttendanceSessions = sessData.attendanceSessions || {};
        }

        // 3. Fetch People
        const peopleRes = await fetch(`${API_URL}/people`);
        if (peopleRes.ok) {
            const pData = await peopleRes.json();
            cachedPeople = pData.people || [];
        }

        // 4. Fetch Tasks
        const tasksRes = await fetch(`${API_URL}/tasks`);
        if (tasksRes.ok) {
            cachedTasks = await tasksRes.json();
        }

        // 5. Fetch Events
        const eventsRes = await fetch(`${API_URL}/events`);
        if (eventsRes.ok) {
            cachedEvents = await eventsRes.json();
        }

        // Update UI
        renderPlanAndNotebookHero();
        checkAndRenderMissedDays();
        renderCardsFromCache();
        renderDaysList();
        renderTasksList();
        renderEventsList();

        // Sync connection indicators on Hero and Dynamic Island
        if (connectionStatusDot) connectionStatusDot.classList.add('online');
        if (connectionStatusText) {
            connectionStatusText.innerText = currentLanguage === 'en' ? 'Cloud Connected ⚡' : 'متصل سحابياً ⚡';
        }
        const islandDot = document.getElementById('islandConnectionDot');
        const islandText = document.getElementById('islandConnectionText');
        if (islandDot) islandDot.classList.add('online');
        if (islandText) {
            islandText.innerText = currentLanguage === 'en' ? 'Connected ⚡' : 'متصل سحابياً ⚡';
        }
    } catch (err) {
        console.error('Error fetching data from API:', err);
        if (connectionStatusDot) connectionStatusDot.classList.remove('online');
        if (connectionStatusText) {
            connectionStatusText.innerText = currentLanguage === 'en' ? 'Local Server' : 'سيرفر محلي';
        }
        const islandDot = document.getElementById('islandConnectionDot');
        const islandText = document.getElementById('islandConnectionText');
        if (islandDot) islandDot.classList.remove('online');
        if (islandText) {
            islandText.innerText = currentLanguage === 'en' ? 'Local Mode' : 'سيرفر محلي';
        }
    }
}

// --- ATTENDANCE SESSION SAVING ---
async function saveAttendanceSession(dateStr, titleStr, recordsMap, source = 'plan', linkedEventId = null) {
    try {
        const payload = {
            date: dateStr,
            title: titleStr,
            source: source,
            linkedEventId: linkedEventId,
            isCompleted: true,
            records: recordsMap
        };

        const res = await fetch(`${API_URL}/attendance-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            cachedAttendanceSessions[dateStr] = payload;
            showToast(`تم تسجيل الحضور ليوم ${dateStr} بنجاح! ✅`);
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
            isCompleted: true,
            records: recordsMap
        };
        showToast(`تم الحفظ محلياً ليوم ${dateStr} ⚡`);
        renderPlanAndNotebookHero();
        checkAndRenderMissedDays();
        renderCardsFromCache();
        return true;
    }
}

// --- PERSON MANAGEMENT HANDLERS ---
async function createPersonHandler(name, role, phone, birthdate, notes) {
    try {
        const res = await fetch(`${API_URL}/people`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, role, phone, birthdate, notes })
        });
        if (res.ok) {
            const data = await res.json();
            cachedPeople.push(data.person);
            showToast(`تم إضافة ${data.person.name} بنجاح! 👤`);
            renderCardsFromCache();
            return true;
        } else {
            const err = await res.json();
            showToast(err.message || 'فشل إضافة الشخص', true);
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

        row.innerHTML = `
            <div>
                <h4 class="font-bold text-sm text-gray-900 dark:text-white">${escapeHTML(sess.title || sess.date)}</h4>
                <span class="text-xs text-gray-500 font-mono">${escapeHTML(sess.date)}</span>
                <div class="flex items-center gap-2 mt-1 text-[11px] font-bold">
                    <span class="text-emerald-600">🟢 ${presentCount} حاضر</span>
                    <span class="text-amber-600">🟡 ${excusedCount} عذر</span>
                    <span class="text-red-600">🔴 ${absentCount} غياب</span>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <button type="button" class="open-day-rec-btn px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow cursor-pointer" data-date="${escapeHTML(sess.date)}" data-title="${escapeHTML(sess.title || '')}">
                    تعديل الحضور ✍️
                </button>
            </div>
        `;

        row.querySelector('.open-day-rec-btn').addEventListener('click', () => {
            openAttendanceModalForDate(sess.date, sess.title, sess.linkedEventId);
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
    const kpiTotalPeople = document.getElementById('kpiTotalPeople');
    const kpiAvgCommitment = document.getElementById('kpiAvgCommitment');
    const kpiUrgentFollowup = document.getElementById('kpiUrgentFollowup');
    const kpiTotalUnexcused = document.getElementById('kpiTotalUnexcused');
    const kpiTotalExcused = document.getElementById('kpiTotalExcused');
    const kpiPerfectPeople = document.getElementById('kpiPerfectPeople');

    if (people.length === 0) {
        if (kpiTotalPeople) kpiTotalPeople.innerText = '0';
        if (kpiAvgCommitment) kpiAvgCommitment.innerText = '0%';
        if (kpiUrgentFollowup) kpiUrgentFollowup.innerText = '0';
        if (kpiTotalUnexcused) kpiTotalUnexcused.innerText = '0';
        if (kpiTotalExcused) kpiTotalExcused.innerText = '0';
        if (kpiPerfectPeople) kpiPerfectPeople.innerText = '0';

        const list = document.getElementById('insightsResultsList');
        if (list) {
            list.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">${currentLanguage === 'en' ? 'Awaiting members to calculate statistics.' : 'في انتظار تسجيل الأفراد لبدء التحليل الإحصائي.'}</p>`;
        }
        return;
    }

    const totalPeople = people.length;
    const avgCommitment = people.reduce((acc, p) => acc + p.commitmentRatio, 0) / (totalPeople || 1);
    const urgentCount = people.filter(p => p.needsFollowUp).length;
    const totalUnexcused = people.reduce((acc, p) => acc + p.unexcusedSessions, 0);
    const totalExcused = people.reduce((acc, p) => acc + p.excusedSessions, 0);
    const perfectCount = people.filter(p => p.commitmentRatio === 1 && p.totalSessions > 0).length;

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
        const whatsAppUrl = formatWhatsAppUrl(p.phone);

        item.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="font-bold">${escapeHTML(p.name)}</span>
                <span class="text-gray-400 font-mono text-[11px]">${p.phone || ''}</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="font-bold text-amber-500">${(p.commitmentRatio * 100).toFixed(0)}% التزام</span>
                ${whatsAppUrl ? `<a href="${whatsAppUrl}" target="_blank" class="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">واتساب</a>` : ''}
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

    // Copy Plan to WhatsApp
    if (copyPlanWhatsAppBtn) {
        copyPlanWhatsAppBtn.addEventListener('click', () => {
            if (!cachedActivePlan || !cachedActivePlan.rawWhatsAppText) {
                showToast('لا توجد خطة مسجلة بعد للنسخ', true);
                return;
            }
            navigator.clipboard.writeText(cachedActivePlan.rawWhatsAppText).then(() => {
                showToast('تم نسخ رسالة الخطة إلى الحافظة بنجاح! 📋 جاهزة للإرسال في واتساب');
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

                const nb = cachedActivePlan.notebookLastPage;
                if (notebookTitleInput) notebookTitleInput.value = nb?.title || '';
                if (notebookContentInput) notebookContentInput.value = nb?.content || '';
            }
            if (planModal) planModal.style.display = 'flex';
        });
    }

    if (closePlanModalXBtn) closePlanModalXBtn.addEventListener('click', () => planModal.style.display = 'none');
    if (cancelPlanModalBtn) cancelPlanModalBtn.addEventListener('click', () => planModal.style.display = 'none');

    // Auto Parse WhatsApp Plan Button
    if (parseWhatsAppPlanBtn) {
        parseWhatsAppPlanBtn.addEventListener('click', () => {
            const raw = planRawTextInput ? planRawTextInput.value : '';
            if (!raw.trim()) {
                showToast('يرجى لصق رسالة الواتساب أولاً في الحقل', true);
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
                notebookLastPage: {
                    title: notebookTitleInput?.value || 'خلاصة آخر صفحة في الكشكول',
                    content: notebookContentInput?.value || '',
                    updatedAt: new Date().toISOString()
                },
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

    // Quick Notebook Modal
    if (quickEditNotebookBtn) {
        quickEditNotebookBtn.addEventListener('click', () => {
            const nb = cachedActivePlan?.notebookLastPage;
            if (quickNotebookTitleInput) quickNotebookTitleInput.value = nb?.title || '';
            if (quickNotebookContentInput) quickNotebookContentInput.value = nb?.content || '';
            if (notebookQuickModal) notebookQuickModal.style.display = 'flex';
        });
    }

    if (closeNotebookQuickXBtn) closeNotebookQuickXBtn.addEventListener('click', () => notebookQuickModal.style.display = 'none');
    if (cancelQuickNotebookBtn) cancelQuickNotebookBtn.addEventListener('click', () => notebookQuickModal.style.display = 'none');

    if (saveQuickNotebookBtn) {
        saveQuickNotebookBtn.addEventListener('click', async () => {
            const title = quickNotebookTitleInput?.value || '';
            const content = quickNotebookContentInput?.value || '';

            const res = await fetch(`${API_URL}/plan/notebook`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content })
            });

            if (res.ok) {
                const data = await res.json();
                if (cachedActivePlan) {
                    cachedActivePlan.notebookLastPage = data.notebookLastPage;
                }
                showToast('تم تحديث صفحة الكشكول بنجاح! 📖');
                notebookQuickModal.style.display = 'none';
                renderPlanAndNotebookHero();
            } else {
                showToast('فشل تحديث الكشكول', true);
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
            if (!dateVal) {
                showToast('يرجى اختيار التاريخ', true);
                return;
            }
            extraDayModal.style.display = 'none';
            openAttendanceModalForDate(dateVal, titleVal);
        });
    }

    // Quick Add Person from input
    if (addPersonBtn) {
        addPersonBtn.addEventListener('click', async () => {
            const name = personNameInput ? personNameInput.value.trim() : '';
            if (!name) {
                showToast('يرجى إدخال اسم الشخص أولاً', true);
                return;
            }
            const success = await createPersonHandler(name, 'member', '', '', '');
            if (success && personNameInput) personNameInput.value = '';
        });
    }

    // Add Person Modal
    if (openAddPersonModalBtn) {
        openAddPersonModalBtn.addEventListener('click', () => {
            if (newPersonFullNameInput) newPersonFullNameInput.value = '';
            if (newPersonPhoneInput) newPersonPhoneInput.value = '';
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
            const role = newPersonRoleSelect ? newPersonRoleSelect.value : 'member';
            const phone = newPersonPhoneInput ? newPersonPhoneInput.value.trim() : '';
            const birthdate = newPersonBirthdateInput ? newPersonBirthdateInput.value : '';
            const notes = newPersonNotesInput ? newPersonNotesInput.value.trim() : '';

            const success = await createPersonHandler(name, role, phone, birthdate, notes);
            if (success) {
                addPersonModal.style.display = 'none';
            }
        });
    }

    // Passkey Login Modal
    if (passkeySignInBtn) {
        passkeySignInBtn.addEventListener('click', () => {
            if (passkeyInput) passkeyInput.value = '';
            if (passkeyLoginModal) passkeyLoginModal.style.display = 'flex';
        });
    }

    if (closePasskeyLoginXBtn) closePasskeyLoginXBtn.addEventListener('click', () => passkeyLoginModal.style.display = 'none');

    if (confirmPasskeyBtn) {
        confirmPasskeyBtn.addEventListener('click', () => {
            const code = (passkeyInput?.value || '').trim().toLowerCase();
            if (code === 'arsany' || code === '777' || code === 'admin') {
                currentUserRole = code === '777' || code === 'admin' ? 'admin' : 'servant';
                localStorage.setItem('passkey_role', currentUserRole);
                showToast(`تم تفعيل وضع ${currentUserRole === 'admin' ? 'مسؤول النظام 👑' : 'الخادم ✍️'} بنجاح!`);
                passkeyLoginModal.style.display = 'none';
                loggedOutView?.classList.add('hidden');
                loggedInView?.classList.remove('hidden');
                if (userName) userName.textContent = currentUserRole === 'admin' ? 'مسؤول الأسرة' : 'خادم وسائل الإيضاح';
                if (userRoleBadge) {
                    userRoleBadge.textContent = currentUserRole === 'admin' ? '👑 مسؤول النظام' : '✍️ خادم الأسرة';
                }
            } else {
                showToast('رمز المرور غير صحيح. استخدم: arsany أو 777', true);
            }
        });
    }

    // Quick Add Attendance Modal Confirm
    if (quickAddConfirmBtn) {
        quickAddConfirmBtn.addEventListener('click', async () => {
            const dateStr = quickAddDateInput?.value;
            const titleStr = dayNameInput?.value || `جلسة حضور ${dateStr}`;
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

            const success = await saveAttendanceSession(dateStr, titleStr, recordsMap);
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

    // --- THEME & LANGUAGE HELPERS ---
    function syncThemeIcons(isDark) {
        if (sunIcon) sunIcon.classList.toggle('hidden', !isDark);
        if (moonIcon) moonIcon.classList.toggle('hidden', isDark);
        const islandSun = document.getElementById('islandSunIcon');
        const islandMoon = document.getElementById('islandMoonIcon');
        if (islandSun) islandSun.classList.toggle('hidden', !isDark);
        if (islandMoon) islandMoon.classList.toggle('hidden', isDark);
    }

    function toggleTheme() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        syncThemeIcons(isDark);
    }

    function toggleLanguage() {
        const newLang = currentLanguage === 'ar' ? 'en' : 'ar';
        applyLanguage(newLang);
    }

    function applyLanguage(lang) {
        currentLanguage = lang;
        localStorage.setItem('language', lang);
        const isEn = lang === 'en';
        document.documentElement.lang = lang;
        document.documentElement.dir = isEn ? 'ltr' : 'rtl';

        if (languageToggleBtn) languageToggleBtn.innerText = isEn ? '🇬🇧 EN' : '🇪🇬 عربي';
        const islandLang = document.getElementById('islandLangLabel');
        if (islandLang) islandLang.innerText = isEn ? '🇬🇧 EN' : '🇪🇬 عربي';

        const isOnline = connectionStatusDot && connectionStatusDot.classList.contains('online');
        if (connectionStatusText) {
            connectionStatusText.innerText = isOnline ? (isEn ? 'Cloud Connected ⚡' : 'متصل سحابياً ⚡') : (isEn ? 'Local Server' : 'سيرفر محلي');
        }
        const islandConnText = document.getElementById('islandConnectionText');
        if (islandConnText) {
            islandConnText.innerText = isOnline ? (isEn ? 'Connected ⚡' : 'متصل سحابياً ⚡') : (isEn ? 'Local Mode' : 'سيرفر محلي');
        }

        const islandServantLabel = document.getElementById('islandServantLabel');
        if (islandServantLabel) {
            islandServantLabel.innerText = currentUserRole === 'admin' ? (isEn ? 'Admin' : 'المسؤول') : (isEn ? 'Servant' : 'الخادم');
        }

        renderPlanAndNotebookHero();
        renderCardsFromCache();
        renderTasksList();
        renderEventsList();
        renderDaysList();
        renderAdminInsights();
    }

    // Theme toggle in Hero
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Language toggle in Hero
    if (languageToggleBtn) {
        languageToggleBtn.addEventListener('click', toggleLanguage);
    }

    // --- DYNAMIC ISLAND ENGINE ---
    function initDynamicIsland() {
        const dynamicIsland = document.getElementById('dynamicIsland');
        const mainAppHeader = document.getElementById('mainAppHeader');
        const islandLogoBtn = document.getElementById('islandLogoBtn');
        const islandThemeToggleBtn = document.getElementById('islandThemeToggleBtn');
        const islandLanguageToggleBtn = document.getElementById('islandLanguageToggleBtn');
        const islandPasskeyBtn = document.getElementById('islandPasskeyBtn');

        if (!dynamicIsland) return;

        // Smooth Scroll transformation: Hero Header <-> Dynamic Island
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            if (scrollY > 75) {
                // Reveal Dynamic Island with smooth spring entry
                dynamicIsland.classList.remove('opacity-0', '-translate-y-12', 'scale-90', 'pointer-events-none');
                dynamicIsland.classList.add('opacity-100', 'translate-y-0', 'scale-100', 'pointer-events-auto');

                // Fade/dim Hero Header so it never obstructs or clutters
                if (mainAppHeader) {
                    mainAppHeader.classList.add('opacity-20', 'pointer-events-none');
                }
            } else {
                // Tuck Dynamic Island away smoothly and fully restore Hero Header
                dynamicIsland.classList.add('opacity-0', '-translate-y-12', 'scale-90', 'pointer-events-none');
                dynamicIsland.classList.remove('opacity-100', 'translate-y-0', 'scale-100', 'pointer-events-auto');

                if (mainAppHeader) {
                    mainAppHeader.classList.remove('opacity-20', 'pointer-events-none');
                }
            }
        }, { passive: true });

        // Tapping Island Logo scrolls cleanly to top
        if (islandLogoBtn) {
            islandLogoBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }

        // Tapping Theme Switcher on Island
        if (islandThemeToggleBtn) {
            islandThemeToggleBtn.addEventListener('click', toggleTheme);
        }

        // Tapping Language Switcher on Island
        if (islandLanguageToggleBtn) {
            islandLanguageToggleBtn.addEventListener('click', toggleLanguage);
        }

        // Tapping Servant Mode button on Island
        if (islandPasskeyBtn) {
            islandPasskeyBtn.addEventListener('click', () => {
                if (passkeySignInBtn) passkeySignInBtn.click();
            });
        }
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

    initDynamicIsland();
}

// --- BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', async () => {
    // Theme setup
    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    syncThemeIcons(isDark);

    // Language setup
    const savedLang = localStorage.getItem('language') || 'ar';
    applyLanguage(savedLang);

    initEventListeners();
    await fetchAllData();
});
