// js/tasks-events.js - Tasks Management, Events & Overload Tracking, and Official Reports Export Center
import { AppStore } from './store.js';
import { escapeHTML, showToast, openModal, closeModal, showCustomConfirm } from './ui.js';

// --- 1. TASKS MANAGEMENT ---
export function renderTasksList() {
    const container = document.getElementById('tasksListContainer');
    const noTasks = document.getElementById('noTasksMessage');
    if (!container) return;
    container.innerHTML = '';

    if (AppStore.tasks.length === 0) {
        if (noTasks) noTasks.classList.remove('hidden');
        return;
    }
    if (noTasks) noTasks.classList.add('hidden');

    const peopleMap = new Map(AppStore.people.map(p => [p.id, p.name]));
    const fragment = document.createDocumentFragment();

    AppStore.tasks.forEach(task => {
        const item = document.createElement('div');
        item.className = 'p-4 rounded-2xl liquid-glass mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right';
        const assignedName = peopleMap.get(task.personId) || 'خادم';

        let statusBadge = '<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-600 border border-amber-500/30">قيد الانتظار ⏳</span>';
        if (task.status === 'in-progress') statusBadge = '<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/20 text-blue-600 border border-blue-500/30">قيد التنفيذ ⚙️</span>';
        else if (task.status === 'completed') statusBadge = '<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">منجزة ✅</span>';
        else if (task.status === 'not-completed') statusBadge = '<span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/20 text-red-600 border border-red-500/30">لم تُنجز ❌</span>';

        item.innerHTML = `
            <div>
                <h4 class="font-bold text-sm text-gray-900 dark:text-white">${escapeHTML(task.description)}</h4>
                <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-1.5">
                    <span>👤 الخادم المكلف: <strong>${escapeHTML(assignedName)}</strong></span>
                    <span>📅 الموعد: <span class="font-mono">${escapeHTML(task.date || '')}</span></span>
                    <button type="button" class="cycle-task-status-btn cursor-pointer transition transform hover:scale-105" data-id="${task.id}" title="اضغط للتبديل بين الحالات الـ 4">${statusBadge}</button>
                </div>
            </div>
            <div class="flex items-center gap-2 self-end sm:self-center">
                <button type="button" class="cycle-task-status-btn px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1" data-id="${task.id}" title="تبديل الحالة التالية">
                    <span>تبديل الحالة 🔄</span>
                </button>
                <button type="button" class="open-edit-task-btn px-2.5 py-1.5 rounded-xl bg-gray-500/20 hover:bg-gray-500/40 text-gray-700 dark:text-gray-200 text-xs font-bold transition cursor-pointer" data-id="${task.id}" title="تعديل المهمة">
                    ✏️
                </button>
                <button type="button" class="delete-task-btn px-2.5 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-600 text-xs font-bold transition cursor-pointer" data-id="${task.id}" title="حذف المهمة">
                    🗑️
                </button>
            </div>
        `;

        // Optimistic cycle status
        item.querySelectorAll('.cycle-task-status-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    await AppStore.cycleTaskStatus(task.id);
                    showToast('تم تحديث حالة المهمة ⚡');
                } catch (e) {
                    showToast('فشل تحديث حالة المهمة', true);
                }
            });
        });

        // Edit task
        item.querySelector('.open-edit-task-btn').addEventListener('click', () => {
            openEditTaskModal(task);
        });

        // Delete task
        item.querySelector('.delete-task-btn').addEventListener('click', async () => {
            const confirmed = await showCustomConfirm('هل أنت متأكد من حذف هذه المهمة؟');
            if (confirmed) {
                await AppStore.deleteTask(task.id);
                showToast('تم حذف المهمة بنجاح');
            }
        });

        fragment.appendChild(item);
    });

    container.appendChild(fragment);
}

function openEditTaskModal(task) {
    const idInput = document.getElementById('editTaskId');
    const descInput = document.getElementById('editTaskDescriptionInput');
    const dateInput = document.getElementById('editTaskDateInput');
    const statusSelect = document.getElementById('editTaskStatus');

    if (idInput) idInput.value = task.id;
    if (descInput) descInput.value = task.description;
    if (dateInput) dateInput.value = task.date;
    if (statusSelect) statusSelect.value = task.status || 'pending';

    openModal('editTaskModal');
}

// --- 2. EVENTS & OVERLOAD TRACKING ---
export function renderEventsList() {
    const container = document.getElementById('eventsContainer');
    const noEvents = document.getElementById('noEventsMessage');
    if (!container) return;
    container.innerHTML = '';

    if (AppStore.events.length === 0) {
        if (noEvents) noEvents.classList.remove('hidden');
        return;
    }
    if (noEvents) noEvents.classList.add('hidden');

    const fragment = document.createDocumentFragment();

    AppStore.events.forEach(ev => {
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
            if (typeof window.openAttendanceModalForDate === 'function') {
                window.openAttendanceModalForDate(todayStr, `${ev.name} - نزول`, ev.id);
            }
        });

        fragment.appendChild(card);
    });

    container.appendChild(fragment);
}

// --- 3. EXPORTS & PRINT REPORT CENTER ---
export function renderReportPreview() {
    const printableArea = document.getElementById('printableReportArea');
    if (!printableArea) return;
    const scopeSelect = document.getElementById('exportScopeSelect');
    const scope = scopeSelect?.value || 'all';
    const peopleWithStats = AppStore.getPeopleWithStats();

    let tableRows = '';
    peopleWithStats.forEach((p, idx) => {
        const commitment = `${(p.commitmentRatio * 100).toFixed(0)}%`;
        const attend = `${p.attendedSessions} / ${p.totalSessions}`;
        tableRows += `
            <tr>
                <td class="p-2 border text-center font-bold">${idx + 1}</td>
                <td class="p-2 border font-bold">${escapeHTML(p.name)}</td>
                <td class="p-2 border text-center font-mono">${attend}</td>
                <td class="p-2 border text-center font-mono">${p.excusedSessions}</td>
                <td class="p-2 border text-center font-bold text-emerald-600 font-mono">${commitment}</td>
                <td class="p-2 border text-center font-mono">${p.totalOverload > 0 ? `+${p.totalOverload} ⚡` : '0'}</td>
                <td class="p-2 border text-center font-mono">${p.completedTasks}/${p.totalTasks}</td>
            </tr>
        `;
    });

    printableArea.innerHTML = `
        <div class="text-center pb-4 mb-4 border-b">
            <h2 class="text-xl font-bold text-gray-900">أسرة الأنبا أرسانيوس والقديس نيقولاوس ✝️</h2>
            <h3 class="text-base font-semibold text-gray-700">تقرير خدمة وسائل الإيضاح والمتابعة</h3>
            <p class="text-xs text-gray-500 mt-1">تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')} - النطاق: ${scope === 'all' ? 'تقرير شامل موحد' : scope}</p>
        </div>
        <table class="report-table w-full text-right text-xs border border-gray-300">
            <thead>
                <tr class="bg-gray-100 dark:bg-gray-800">
                    <th class="p-2 border text-center">م</th>
                    <th class="p-2 border">الاسم الكامل</th>
                    <th class="p-2 border text-center">حضور / إجمالي</th>
                    <th class="p-2 border text-center">أعذار</th>
                    <th class="p-2 border text-center">صافي الالتزام</th>
                    <th class="p-2 border text-center">Overload ⚡</th>
                    <th class="p-2 border text-center">المهام</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;
}

export function exportDataAsCSV() {
    const peopleWithStats = AppStore.getPeopleWithStats();
    let csv = '\uFEFF'; // UTF-8 BOM for perfect Arabic display in Excel
    csv += 'م,الاسم الكامل,الرتبة,حضور,أعذار,غياب بدون عذر,إجمالي الجلسات,صافي الالتزام %,Overload ⚡,مهام منجزة,إجمالي المهام\n';

    peopleWithStats.forEach((p, idx) => {
        const commitment = Math.round(p.commitmentRatio * 100);
        csv += `"${idx + 1}","${p.name}","خادم ✝️","${p.attendedSessions}","${p.excusedSessions}","${p.unexcusedSessions}","${p.totalSessions}","${commitment}%","${p.totalOverload}","${p.completedTasks}","${p.totalTasks}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `تقرير_خدمة_وسائل_الإيضاح_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('تم تصدير ملف الإكسيل (CSV) بنجاح 📗');
}

// --- MODULE INITIALIZER ---
export function initTasksEventsReports() {
    // Tasks UI hooks
    const addTaskBtn = document.getElementById('addTaskBtn');
    const addTaskCancel = document.getElementById('addTaskCancelBtn');
    const addTaskConfirm = document.getElementById('addTaskConfirmBtn');
    const editTaskCancel = document.getElementById('editTaskCancelBtn');
    const editTaskSave = document.getElementById('editTaskSaveBtn');

    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => {
            const desc = document.getElementById('taskDescriptionInput');
            const date = document.getElementById('taskDateInput');
            const list = document.getElementById('taskPeopleList');

            if (desc) desc.value = '';
            if (date) date.value = new Date().toISOString().slice(0, 10);
            if (list) {
                list.innerHTML = '';
                const fragment = document.createDocumentFragment();
                AppStore.people.forEach(p => {
                    const row = document.createElement('label');
                    row.className = 'flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg cursor-pointer text-xs';
                    row.innerHTML = `
                        <input type="checkbox" value="${p.id}" class="task-person-checkbox accent-amber-600">
                        <span class="font-bold">${escapeHTML(p.name)}</span>
                        <span class="text-[10px] text-gray-400">خادم ✝️</span>
                    `;
                    fragment.appendChild(row);
                });
                list.appendChild(fragment);
            }
            openModal('addTaskModal');
        });
    }

    if (addTaskCancel) addTaskCancel.addEventListener('click', () => closeModal('addTaskModal'));

    if (addTaskConfirm) {
        addTaskConfirm.addEventListener('click', async () => {
            const desc = document.getElementById('taskDescriptionInput')?.value?.trim();
            const date = document.getElementById('taskDateInput')?.value || new Date().toISOString().slice(0, 10);
            const checkboxes = document.querySelectorAll('#taskPeopleList .task-person-checkbox:checked');
            const selectedIds = Array.from(checkboxes).map(cb => cb.value);

            if (!desc) {
                showToast('يرجى إدخال وصف المهمة', true);
                return;
            }
            if (selectedIds.length === 0) {
                showToast('يرجى اختيار خادم واحد على الأقل', true);
                return;
            }

            for (const pId of selectedIds) {
                await AppStore.createTask({
                    description: desc,
                    date: date,
                    personId: pId,
                    status: 'pending'
                });
            }

            closeModal('addTaskModal');
            showToast(`تمت إضافة وتكليف المهمة لـ ${selectedIds.length} خادم! 📝`);
        });
    }

    if (editTaskCancel) editTaskCancel.addEventListener('click', () => closeModal('editTaskModal'));

    if (editTaskSave) {
        editTaskSave.addEventListener('click', async () => {
            const tId = document.getElementById('editTaskId')?.value;
            const desc = document.getElementById('editTaskDescriptionInput')?.value?.trim();
            const date = document.getElementById('editTaskDateInput')?.value;
            const status = document.getElementById('editTaskStatus')?.value || 'pending';

            if (!tId || !desc) {
                showToast('البيانات غير مكتملة', true);
                return;
            }

            const current = AppStore.tasks.find(t => t.id === tId);
            await AppStore.updateTask(tId, {
                description: desc,
                date: date,
                status: status,
                personId: current ? current.personId : ''
            });

            closeModal('editTaskModal');
            showToast('تم حفظ تعديل المهمة بنجاح ✅');
        });
    }

    // Events UI hooks
    const openAddEventBtn = document.getElementById('openAddEventModalBtn');
    const addEventQuickBtn = document.getElementById('addEventQuickBtn');
    const cancelEventBtn = document.getElementById('cancelEventBtn');
    const saveEventBtn = document.getElementById('saveEventBtn');

    function openEventCreateModal() {
        const todayStr = new Date().toISOString().slice(0, 10);
        const nameIn = document.getElementById('eventNameInput');
        const descIn = document.getElementById('eventDescriptionInput');
        const startIn = document.getElementById('eventStartDateInput');
        const endIn = document.getElementById('eventEndDateInput');
        const targetIn = document.getElementById('eventTargetInput');

        if (nameIn) nameIn.value = '';
        if (descIn) descIn.value = '';
        if (startIn) startIn.value = todayStr;
        if (endIn) endIn.value = '';
        if (targetIn) targetIn.value = '2';
        openModal('addEventModal');
    }

    if (openAddEventBtn) openAddEventBtn.addEventListener('click', openEventCreateModal);
    if (addEventQuickBtn) addEventQuickBtn.addEventListener('click', openEventCreateModal);
    if (cancelEventBtn) cancelEventBtn.addEventListener('click', () => closeModal('addEventModal'));

    if (saveEventBtn) {
        saveEventBtn.addEventListener('click', async () => {
            const name = document.getElementById('eventNameInput')?.value?.trim();
            const desc = document.getElementById('eventDescriptionInput')?.value?.trim();
            const start = document.getElementById('eventStartDateInput')?.value;
            const end = document.getElementById('eventEndDateInput')?.value;
            const target = parseInt(document.getElementById('eventTargetInput')?.value, 10) || 2;

            if (!name || !start) {
                showToast('اسم الحدث وتاريخ البداية مطلوبان', true);
                return;
            }

            await AppStore.createEvent({
                name,
                description: desc,
                startDate: start,
                endDate: end,
                targetCount: target
            });

            closeModal('addEventModal');
            showToast(`تم حفظ الحدث ${name} بنجاح! 🎪`);
        });
    }

    // Reports UI hooks
    const openExportBtn = document.getElementById('openExportCenterBtn');
    const closeExportBtn = document.getElementById('closeExportModalBtn');
    const closeExportBottomBtn = document.getElementById('closeExportBottomBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const printBtn = document.getElementById('printReportBtn');
    const refreshPreviewBtn = document.getElementById('refreshReportPreviewBtn');
    const scopeSelect = document.getElementById('exportScopeSelect');
    const personSelect = document.getElementById('exportSpecificPersonSelect');
    const eventSelect = document.getElementById('exportSpecificEventSelect');

    if (openExportBtn) {
        openExportBtn.addEventListener('click', () => {
            if (personSelect) {
                personSelect.innerHTML = AppStore.people.map(p => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('');
            }
            if (eventSelect) {
                eventSelect.innerHTML = AppStore.events.map(e => `<option value="${e.id}">${escapeHTML(e.name)}</option>`).join('');
            }
            renderReportPreview();
            openModal('exportReportsModal');
        });
    }

    if (closeExportBtn) closeExportBtn.addEventListener('click', () => closeModal('exportReportsModal'));
    if (closeExportBottomBtn) closeExportBottomBtn.addEventListener('click', () => closeModal('exportReportsModal'));

    if (scopeSelect) {
        scopeSelect.addEventListener('change', (e) => {
            const pRow = document.getElementById('exportSpecificPersonRow');
            const eRow = document.getElementById('exportSpecificEventRow');
            if (pRow) pRow.classList.toggle('hidden', e.target.value !== 'specific-person');
            if (eRow) eRow.classList.toggle('hidden', e.target.value !== 'specific-event');
            renderReportPreview();
        });
    }

    if (refreshPreviewBtn) refreshPreviewBtn.addEventListener('click', renderReportPreview);

    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            exportDataAsCSV();
        });
    }

    if (printBtn) printBtn.addEventListener('click', () => window.print());
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', () => window.print());

    // Subscribe to store updates
    AppStore.subscribe(() => {
        renderTasksList();
        renderEventsList();
    });

    renderTasksList();
    renderEventsList();
}
