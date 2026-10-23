// js/servants.js - Servants Grid, Instant Search, Attendance Recording Sheet & History
import { AppStore } from './store.js';
import { escapeHTML, showToast, openModal, closeModal, showCustomConfirm } from './ui.js';

let personCardsSearchQuery = '';
let currentEditingPersonId = null;
let currentAdminQuestion = 'unexcused';

// Day Type Badge Helper
export function getDayTypeInfo(dayType) {
    switch (dayType) {
        case 'work':
            return {
                label: 'شغل',
                fullLabel: '2. شغل 🛠️',
                badgeClass: 'bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/40'
            };
        case 'meeting_work':
            return {
                label: 'اجتماع وشغل',
                fullLabel: '3. اجتماع وشغل 📖🛠️',
                badgeClass: 'bg-purple-500/15 text-purple-800 dark:text-purple-200 border-purple-500/40'
            };
        case 'meeting':
        default:
            return {
                label: 'اجتماع',
                fullLabel: '1. اجتماع 📖',
                badgeClass: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/40'
            };
    }
}

export function getDayTypeBadge(dayType) {
    const info = getDayTypeInfo(dayType);
    return `<span class="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full border font-bold ${info.badgeClass}">${info.fullLabel}</span>`;
}

// --- RENDER SERVANT CARDS ---
export function renderCardsFromStore() {
    const container = document.getElementById('personCardsContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const noDataMessage = document.getElementById('noDataMessage');
    const countBadge = document.getElementById('personSearchResultsCount');
    const clearBtn = document.getElementById('clearPersonCardsSearchBtn');

    if (!container) return;
    if (loadingIndicator) loadingIndicator.classList.add('hidden');
    container.innerHTML = '';

    const allPeopleWithStats = AppStore.getPeopleWithStats();

    if (allPeopleWithStats.length === 0) {
        if (noDataMessage) noDataMessage.classList.remove('hidden');
        if (countBadge) countBadge.innerText = '0 شخص';
        return;
    }
    if (noDataMessage) noDataMessage.classList.add('hidden');

    const query = (personCardsSearchQuery || '').trim().toLowerCase();
    const filtered = allPeopleWithStats.filter(p => {
        if (!query) return true;
        return (p.name || '').toLowerCase().includes(query);
    });

    if (countBadge) {
        countBadge.innerText = `${filtered.length} من ${allPeopleWithStats.length} خادم`;
    }
    if (clearBtn) {
        clearBtn.classList.toggle('hidden', !query);
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 p-6 rounded-3xl liquid-glass">
                <span class="text-4xl block mb-2">🔍</span>
                <h4 class="text-base font-bold mb-1" style="color: var(--card-text-color)">لا توجد نتائج مطابقة للبحث "${escapeHTML(personCardsSearchQuery)}"</h4>
                <p class="text-xs text-gray-500">تأكد من كتابة الاسم بصورة صحيحة.</p>
                <button type="button" id="resetServantSearchBtn" class="mt-4 px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white cursor-pointer hover:bg-amber-600 transition shadow">
                    عرض جميع الخدام
                </button>
            </div>
        `;
        const resetBtn = document.getElementById('resetServantSearchBtn');
        if (resetBtn) {
            resetBtn.onclick = () => window.clearPersonSearchAndFocus();
        }
        renderAdminInsights();
        return;
    }

    const fragment = document.createDocumentFragment();

    filtered.forEach(person => {
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
            <!-- 1. Card Top Action & Role Bar (Flexbox flow, zero absolute positioning) -->
            <div class="w-full flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-amber-500/15">
                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30">
                    خادم ✝️
                </span>
                <div class="flex items-center gap-1.5">
                    <button class="analytics-person-btn p-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 transition cursor-pointer shadow-sm" data-id="${escapeHTML(person.id)}" title="رسوم بيانية وإحصائيات">
                        📊
                    </button>
                    <button class="edit-name-btn p-1.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-amber-500/20 text-gray-700 dark:text-gray-200 transition cursor-pointer shadow-sm" data-id="${escapeHTML(person.id)}" title="تعديل الاسم">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                    </button>
                    <button class="delete-person-btn p-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/30 text-red-600 transition cursor-pointer shadow-sm" data-id="${escapeHTML(person.id)}" title="حذف الخادم">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>

            <!-- 2. Servant Identity: Centered Avatar & Full Name -->
            <div class="flex flex-col items-center w-full mb-3">
                <div class="avatar shadow-md mx-auto mb-2 cursor-pointer" data-id="${escapeHTML(person.id)}" title="اضغط لعرض سجل الحضور">
                    ${firstLetter}
                </div>
                <h3 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white break-words text-center leading-snug cursor-pointer hover:text-amber-600 transition" data-id="${escapeHTML(person.id)}" title="اضغط لعرض سجل الحضور">
                    ${safeRawName}
                </h3>

                <!-- Status Badges Row (Overload & Needs Follow-up) -->
                <div class="flex flex-wrap items-center justify-center gap-1.5 mt-2">
                    ${person.totalOverload > 0 ? `
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                        <span>⚡ Overload: +${person.totalOverload} نزول</span>
                    </span>` : ''}

                    ${person.needsFollowUp ? `
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30">
                        <span>⚠️ تنبيه للافتقاد (${person.unexcusedSessions} غياب)</span>
                    </span>` : ''}
                </div>
            </div>

            <!-- 3. Commitment Progress Bar -->
            <div class="w-full mb-3 px-1">
                <div class="flex justify-between items-center text-xs font-bold mb-1.5">
                    <span class="text-gray-600 dark:text-gray-300">صافي الالتزام بالعذر:</span>
                    <span class="text-amber-800 dark:text-amber-200 font-mono font-bold">${commitmentPercentage}%</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${commitmentPercentage}%; background: ${progressColor};"></div>
                </div>
            </div>

            <!-- 4. Attendance Counts Box -->
            <div class="w-full p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-white/10 mb-2">
                <div class="grid grid-cols-3 gap-1.5 text-center text-xs font-bold">
                    <span class="px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30" title="حاضر">🟢 ${person.attendedSessions}</span>
                    <span class="px-2 py-1 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30" title="غياب باعتذار">🟡 ${person.excusedSessions}</span>
                    <span class="px-2 py-1 rounded-lg bg-red-500/15 text-red-800 dark:text-red-200 border border-red-500/30" title="غياب بدون عذر">🔴 ${person.unexcusedSessions}</span>
                </div>
            </div>

            <!-- 5. Tasks Progress Box -->
            <div class="w-full p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center text-xs font-bold text-blue-800 dark:text-blue-200">
                <span>📝 ${person.completedTasks} من ${person.totalTasks} مهام منجزة</span>
            </div>
        `;

        fragment.appendChild(card);
    });

    container.appendChild(fragment);
    renderAdminInsights();
}

// Global Clear search
window.clearPersonSearchAndFocus = () => {
    personCardsSearchQuery = '';
    const input = document.getElementById('personCardsSearchInput');
    if (input) {
        input.value = '';
        input.focus();
    }
    renderCardsFromStore();
};

// --- ATTENDANCE MODAL (RECORD / EDIT) ---
export function openAttendanceModalForDate(targetDate, targetTitle = '', linkedEventId = null, forcedDayType = null) {
    const dateInput = document.getElementById('quickAddDateInput');
    const nameInput = document.getElementById('dayNameInput');
    const dayTypeSelect = document.getElementById('quickAddDayTypeSelect');

    if (dateInput) dateInput.value = targetDate;
    if (nameInput) nameInput.value = targetTitle || `جلسة حضور ${targetDate}`;

    const existingSession = AppStore.attendanceSessions[targetDate];
    const dayTypeVal = forcedDayType || existingSession?.dayType || 'meeting';
    if (dayTypeSelect) dayTypeSelect.value = dayTypeVal;

    renderQuickAddListForDate(targetDate);
    openModal('quickAddModal');
}
window.openAttendanceModalForDate = openAttendanceModalForDate;

export function renderQuickAddListForDate(dateStr) {
    const list = document.getElementById('quickAddList');
    const searchInput = document.getElementById('quickAddSearchInput');
    if (!list) return;
    list.innerHTML = '';

    const session = AppStore.attendanceSessions[dateStr];
    const existingRecords = session?.records || {};
    const query = (searchInput?.value || '').trim().toLowerCase();
    const fragment = document.createDocumentFragment();

    AppStore.people.forEach(person => {
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

        fragment.appendChild(row);
    });

    list.appendChild(fragment);
}

// --- ATTENDANCE SESSIONS LIST IN MAIN VIEW ---
export function renderDaysList() {
    const container = document.getElementById('daysListContainer');
    const noDays = document.getElementById('noDaysMessage');
    if (!container) return;
    container.innerHTML = '';

    const sessions = Object.values(AppStore.attendanceSessions || {});
    sessions.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sessions.length === 0) {
        if (noDays) noDays.classList.remove('hidden');
        return;
    }
    if (noDays) noDays.classList.add('hidden');

    const fragment = document.createDocumentFragment();

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

        fragment.appendChild(row);
    });

    container.appendChild(fragment);
}

// --- PERSON ATTENDANCE HISTORY MODAL ---
export function openPersonHistoryModal(personId) {
    const person = AppStore.people.find(p => p.id === personId);
    if (!person) return;

    const titleEl = document.getElementById('personHistoryTitle');
    const listEl = document.getElementById('personHistoryList');
    if (titleEl) titleEl.innerText = `سجل حضور الخادم: ${person.name} ✝️`;
    if (!listEl) return;
    listEl.innerHTML = '';

    const sessions = Object.values(AppStore.attendanceSessions || {}).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sessions.length === 0) {
        listEl.innerHTML = '<li class="p-4 text-center text-xs text-gray-400">لا توجد جلسات حضور مسجلة بعد.</li>';
    } else {
        const fragment = document.createDocumentFragment();

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
            fragment.appendChild(li);
        });

        if (fragment.children.length === 0) {
            listEl.innerHTML = '<li class="p-4 text-center text-xs text-gray-400">لم يتم تسجيل حضور أو غياب لهذا الخادم في أي جلسة حتى الآن.</li>';
        } else {
            listEl.appendChild(fragment);
        }
    }

    openModal('personHistoryModal');
}

// --- ADMIN INSIGHTS ---
export function renderAdminInsights() {
    const metrics = AppStore.getOverallMetrics();

    const kpiTotalPeople = document.getElementById('kpiTotalPeople');
    const kpiAvgCommitment = document.getElementById('kpiAvgCommitment');
    const kpiUrgentFollowup = document.getElementById('kpiUrgentFollowup');
    const kpiTotalUnexcused = document.getElementById('kpiTotalUnexcused');
    const kpiTotalExcused = document.getElementById('kpiTotalExcused');
    const kpiPerfectPeople = document.getElementById('kpiPerfectPeople');

    if (kpiTotalPeople) kpiTotalPeople.innerText = metrics.totalServants;
    if (kpiAvgCommitment) kpiAvgCommitment.innerText = `${metrics.avgCommitmentPct}%`;
    if (kpiUrgentFollowup) kpiUrgentFollowup.innerText = metrics.urgentFollowupCount;
    if (kpiTotalUnexcused) kpiTotalUnexcused.innerText = metrics.totalUnexcused;
    if (kpiTotalExcused) kpiTotalExcused.innerText = metrics.totalExcused;
    if (kpiPerfectPeople) kpiPerfectPeople.innerText = metrics.perfectAttendanceCount;

    renderAdminQuestionResults(currentAdminQuestion);
}

function renderAdminQuestionResults(qKey) {
    const list = document.getElementById('insightsResultsList');
    if (!list) return;
    list.innerHTML = '';

    const people = AppStore.getPeopleWithStats();
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

    const fragment = document.createDocumentFragment();

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
        fragment.appendChild(item);
    });

    list.appendChild(fragment);
}

// --- MODULE INITIALIZER ---
export function initServantsAndAttendance() {
    const searchInput = document.getElementById('personCardsSearchInput');
    const clearSearchBtn = document.getElementById('clearPersonCardsSearchBtn');
    const addPersonQuickBtn = document.getElementById('addPersonBtn');
    const quickPersonInput = document.getElementById('personNameInput');
    const openAddPersonBtn = document.getElementById('openAddPersonModalBtn');
    const closeAddPersonX = document.getElementById('closeAddPersonModalXBtn');
    const cancelAddPersonBtn = document.getElementById('cancelAddPersonBtn');
    const confirmAddPersonBtn = document.getElementById('confirmAddPersonBtn');

    const quickAddBtn = document.getElementById('quickAddBtn');
    const quickAddCloseX = document.getElementById('quickAddCloseXBtn');
    const quickAddCancelBtn = document.getElementById('quickAddCancelBtn');
    const quickAddConfirmBtn = document.getElementById('quickAddConfirmBtn');
    const markAllPresentBtn = document.getElementById('markAllPresentBtn');
    const markAllAbsentBtn = document.getElementById('markAllAbsentBtn');
    const quickAddSearchInput = document.getElementById('quickAddSearchInput');

    const editNameSaveBtn = document.getElementById('editNameSaveBtn');
    const editNameCancelBtn = document.getElementById('editNameCancelBtn');
    const editNameInput = document.getElementById('editNameInput');

    const closeHistoryX = document.getElementById('closePersonHistoryXBtn');
    const closeHistoryBtn = document.getElementById('closePersonHistoryBtn');

    // 1. Search with 80ms debounce + requestAnimationFrame
    if (searchInput) {
        let debounceTimer = null;
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value;
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                window.requestAnimationFrame(() => {
                    personCardsSearchQuery = val;
                    renderCardsFromStore();
                });
            }, 80);
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            window.clearPersonSearchAndFocus();
        });
    }

    // 2. Quick Add Person from Toolbar
    if (addPersonQuickBtn) {
        addPersonQuickBtn.addEventListener('click', async () => {
            const name = quickPersonInput ? quickPersonInput.value.trim() : '';
            if (!name) {
                showToast('يرجى إدخال اسم الخادم أولاً', true);
                return;
            }
            await AppStore.createPerson(name, 'servant');
            if (quickPersonInput) quickPersonInput.value = '';
            showToast(`تمت إضافة الخادم ${name} بنجاح! ✝️`);
        });
    }

    // 3. Add Person Modal
    if (openAddPersonBtn) {
        openAddPersonBtn.addEventListener('click', () => {
            const nameIn = document.getElementById('newPersonFullNameInput');
            const birthIn = document.getElementById('newPersonBirthdateInput');
            const noteIn = document.getElementById('newPersonNotesInput');
            if (nameIn) nameIn.value = '';
            if (birthIn) birthIn.value = '';
            if (noteIn) noteIn.value = '';
            openModal('addPersonModal');
        });
    }

    if (closeAddPersonX) closeAddPersonX.addEventListener('click', () => closeModal('addPersonModal'));
    if (cancelAddPersonBtn) cancelAddPersonBtn.addEventListener('click', () => closeModal('addPersonModal'));

    if (confirmAddPersonBtn) {
        confirmAddPersonBtn.addEventListener('click', async () => {
            const name = document.getElementById('newPersonFullNameInput')?.value.trim();
            const birthdate = document.getElementById('newPersonBirthdateInput')?.value || '';
            const notes = document.getElementById('newPersonNotesInput')?.value.trim() || '';

            if (!name) {
                showToast('الاسم الكامل مطلوب', true);
                return;
            }

            await AppStore.createPerson(name, 'servant', birthdate, notes);
            closeModal('addPersonModal');
            showToast(`تمت إضافة الخادم ${name} بنجاح! ✝️`);
        });
    }

    // 4. Edit Name Modal
    if (editNameCancelBtn) editNameCancelBtn.addEventListener('click', () => closeModal('editNameModal'));
    if (editNameSaveBtn) {
        editNameSaveBtn.addEventListener('click', async () => {
            const newName = editNameInput?.value?.trim();
            if (!newName) {
                showToast('يرجى إدخال اسم صحيح', true);
                return;
            }
            if (currentEditingPersonId) {
                await AppStore.updatePersonName(currentEditingPersonId, newName);
                closeModal('editNameModal');
                showToast('تم تحديث اسم الخادم بنجاح ✅');
            }
        });
    }

    // 5. Card click actions delegation
    const cardsContainer = document.getElementById('personCardsContainer');
    if (cardsContainer) {
        cardsContainer.addEventListener('click', async (e) => {
            // A. Analytics Button 📊
            const analyticsBtn = e.target.closest('.analytics-person-btn');
            if (analyticsBtn) {
                e.stopPropagation();
                const personId = analyticsBtn.dataset.id;
                if (typeof window.openPersonAnalyticsModal === 'function') {
                    window.openPersonAnalyticsModal(personId);
                }
                return;
            }

            // B. Edit Name Button ✏️
            const editBtn = e.target.closest('.edit-name-btn');
            if (editBtn) {
                e.stopPropagation();
                const personId = editBtn.dataset.id;
                const person = AppStore.people.find(p => p.id === personId);
                if (person) {
                    currentEditingPersonId = personId;
                    if (editNameInput) editNameInput.value = person.name;
                    openModal('editNameModal');
                }
                return;
            }

            // C. Delete Button 🗑️
            const deleteBtn = e.target.closest('.delete-person-btn');
            if (deleteBtn) {
                e.stopPropagation();
                const personId = deleteBtn.dataset.id;
                const person = AppStore.people.find(p => p.id === personId);
                const confirmed = await showCustomConfirm(`هل أنت متأكد من حذف الخادم ${person ? person.name : ''} نهائياً؟`);
                if (confirmed) {
                    await AppStore.deletePerson(personId);
                    showToast('تم حذف الخادم بنجاح');
                }
                return;
            }

            // D. Avatar or Name -> Open History
            const historyTrigger = e.target.closest('.avatar, h3');
            if (historyTrigger) {
                const card = historyTrigger.closest('.person-card');
                const personId = card?.dataset.id || historyTrigger.dataset.id;
                if (personId) {
                    openPersonHistoryModal(personId);
                }
            }
        });
    }

    // 6. History modal close
    if (closeHistoryX) closeHistoryX.addEventListener('click', () => closeModal('personHistoryModal'));
    if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', () => closeModal('personHistoryModal'));

    // 7. Quick Attendance Sheet Wiring
    if (quickAddBtn) {
        quickAddBtn.addEventListener('click', () => {
            const todayStr = new Date().toISOString().slice(0, 10);
            openAttendanceModalForDate(todayStr, 'اجتماع خدمة وسائل الإيضاح');
        });
    }

    if (quickAddCloseX) quickAddCloseX.addEventListener('click', () => closeModal('quickAddModal'));
    if (quickAddCancelBtn) quickAddCancelBtn.addEventListener('click', () => closeModal('quickAddModal'));

    if (markAllPresentBtn) {
        markAllPresentBtn.addEventListener('click', () => {
            const quickList = document.getElementById('quickAddList');
            if (quickList) {
                quickList.querySelectorAll('input[value="present"]').forEach(r => r.checked = true);
            }
        });
    }

    if (markAllAbsentBtn) {
        markAllAbsentBtn.addEventListener('click', () => {
            const quickList = document.getElementById('quickAddList');
            if (quickList) {
                quickList.querySelectorAll('input[value="absent"]').forEach(r => r.checked = true);
            }
        });
    }

    if (quickAddSearchInput) {
        quickAddSearchInput.addEventListener('input', () => {
            const dateInput = document.getElementById('quickAddDateInput');
            const dateStr = dateInput?.value || new Date().toISOString().slice(0, 10);
            renderQuickAddListForDate(dateStr);
        });
    }

    if (quickAddConfirmBtn) {
        quickAddConfirmBtn.addEventListener('click', async () => {
            const dateInput = document.getElementById('quickAddDateInput');
            const nameInput = document.getElementById('dayNameInput');
            const typeSelect = document.getElementById('quickAddDayTypeSelect');
            const quickList = document.getElementById('quickAddList');

            const dateStr = dateInput?.value;
            const titleStr = nameInput?.value || `جلسة حضور ${dateStr}`;
            const dayTypeStr = typeSelect?.value || 'meeting';

            if (!dateStr) {
                showToast('يرجى تحديد تاريخ الجلسة', true);
                return;
            }

            const recordsMap = {};
            if (quickList) {
                const rows = quickList.querySelectorAll('.quick-add-person-row');
                rows.forEach(row => {
                    const pId = row.dataset.personId;
                    const checkedRadio = row.querySelector(`input[name="status_${pId}"]:checked`);
                    recordsMap[pId] = checkedRadio ? checkedRadio.value : 'present';
                });
            }

            await AppStore.saveAttendanceSession(dateStr, titleStr, recordsMap, 'manual_session', null, dayTypeStr);
            closeModal('quickAddModal');
            showToast(`تم تسجيل الحضور ليوم ${dateStr} بنجاح! ✅`);
        });
    }

    // Subscribe to store updates
    AppStore.subscribe(() => {
        renderCardsFromStore();
        renderDaysList();
    });

    renderCardsFromStore();
    renderDaysList();
}
