// js/plan.js - Weekly Plan, Smart Date Extractor, Notebook & Missed-Days Detector
import { AppStore } from './store.js';
import { escapeHTML, showToast, openModal, closeModal } from './ui.js';

// Format WhatsApp symbols (*bold*, _italic_, ~strike~) to HTML
export function formatPlanTextToHTML(text) {
    if (!text) return '<span class="text-gray-400">لا يوجد نص تفصيلي للخطة حتى الآن. اضغط على "تعديل الخطة" لإضافة جدول الخطة.</span>';
    let formatted = escapeHTML(text);
    // Replace *text* with <strong>text</strong>
    formatted = formatted.replace(/\*([^*]+)\*/g, '<strong class="text-amber-800 dark:text-amber-300 font-bold">$1</strong>');
    // Replace _text_ with <em>text</em>
    formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');
    // Replace ~text~ with <del>text</del>
    formatted = formatted.replace(/~([^~]+)~/g, '<del class="opacity-75">$1</del>');
    // Convert newlines to breaks
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
}

// Smart Parser supporting both the rich Monthly Structured format and traditional WhatsApp line formats
export function parseWhatsAppPlanText(text) {
    if (!text) return [];
    const lines = text.split('\n');
    const parsedDays = [];
    let baseYear = new Date().getFullYear();
    let currentActiveYear = baseYear;
    let lastSeenMonth = null;

    // Check if the text matches the monthly structured block format (contains "التاريخ:" or "شهر")
    const isStructuredMonthly = /التاريخ:|النشاط:|المناسبة:|شهر/i.test(text);

    if (isStructuredMonthly) {
        let currentDayObj = null;

        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i].trim();
            if (!rawLine) continue;

            // 1. Detect Month Headers like: 🔵 شهر أكتوبر (10) or شهر يناير (1)
            const monthHeaderMatch = rawLine.match(/شهر\s+([^\s(]+)\s*(?:\((\d{1,2})\))?/);
            if (monthHeaderMatch) {
                let mNum = null;
                if (monthHeaderMatch[2]) {
                    mNum = parseInt(monthHeaderMatch[2], 10);
                } else {
                    const mName = monthHeaderMatch[1];
                    const monthMap = {
                        'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4, 'ابريل': 4,
                        'مايو': 5, 'يونيو': 6, 'يوليو': 7, 'أغسطس': 8, 'اغسطس': 8,
                        'سبتمبر': 9, 'أكتوبر': 10, 'اكتوبر': 10, 'نوفمبر': 11, 'ديسمبر': 12
                    };
                    mNum = monthMap[mName] || null;
                }

                if (mNum) {
                    if (lastSeenMonth !== null && mNum < lastSeenMonth) {
                        // Month rolled over into next year (e.g., Dec (12) -> Jan (1))
                        currentActiveYear++;
                    }
                    lastSeenMonth = mNum;
                }
                continue;
            }

            // 2. Detect Date Line like: 🔴 التاريخ: 19 / 10 or ⭐ التاريخ: 23 / 11 (مناسبة خاصة)
            const dateMatch = rawLine.match(/(?:التاريخ\s*[:\-])?\s*(\d{1,2})\s*[/\\-]\s*(\d{1,2})/);
            if (dateMatch && (rawLine.includes('التاريخ') || rawLine.includes('/') || rawLine.includes('-'))) {
                // Save previous day if exists
                if (currentDayObj && currentDayObj.date) {
                    parsedDays.push(currentDayObj);
                }

                let d = parseInt(dateMatch[1], 10);
                let m = parseInt(dateMatch[2], 10);

                // If first part is month > 12, swap
                if (d > 12 && m <= 12) {
                    // standard: day is d, month is m
                } else if (d <= 12 && m > 12) {
                    const tmp = d;
                    d = m;
                    m = tmp;
                }

                if (lastSeenMonth !== null && m < lastSeenMonth) {
                    currentActiveYear++;
                }
                lastSeenMonth = m;

                const padD = String(d).padStart(2, '0');
                const padM = String(m).padStart(2, '0');
                const isoDate = `${currentActiveYear}-${padM}-${padD}`;

                currentDayObj = {
                    date: isoDate,
                    dayTitle: '',
                    details: rawLine,
                    linkedEventId: null
                };
                continue;
            }

            // 3. Detect Activity or Event Title (🎯 النشاط: or 🎯 المناسبة:)
            if (currentDayObj) {
                const activityMatch = rawLine.match(/(?:النشاط|المناسبة)\s*[:\-]\s*(.+)/);
                if (activityMatch) {
                    const act = activityMatch[1].trim();
                    currentDayObj.dayTitle = currentDayObj.dayTitle ? `${currentDayObj.dayTitle} - ${act}` : act;
                    continue;
                }

                // Sub-items like: ١. فريمات للتصوير 📸🖼️ or ٢. تزيين بيت العدرا
                const subItemMatch = rawLine.match(/^[0-9١-٩]+[.\-)]\s*(.+)/);
                if (subItemMatch) {
                    const itemText = subItemMatch[1].trim();
                    currentDayObj.dayTitle = currentDayObj.dayTitle ? `${currentDayObj.dayTitle} + ${itemText}` : itemText;
                    continue;
                }

                // Place or day info: 📍 المكان: or 🗓️ اليوم:
                const placeMatch = rawLine.match(/(?:المكان|اليوم)\s*[:\-]\s*(.+)/);
                if (placeMatch) {
                    const info = placeMatch[1].trim();
                    currentDayObj.details = `${currentDayObj.details} | ${info}`;
                    continue;
                }
            }
        }

        if (currentDayObj && currentDayObj.date) {
            parsedDays.push(currentDayObj);
        }
    }

    // Fallback: Line-by-line regex if structured parser yielded no days
    if (parsedDays.length === 0) {
        lines.forEach(line => {
            const clean = line.trim();
            if (!clean) return;

            const dateMatch = clean.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})|(\d{1,2}[-/]\d{1,2})/);
            if (dateMatch) {
                const matchedDateStr = dateMatch[0];
                let isoDate = '';

                if (matchedDateStr.includes('-') && matchedDateStr.length >= 8) {
                    isoDate = matchedDateStr;
                } else {
                    const parts = matchedDateStr.split(/[-/]/);
                    let part1 = parseInt(parts[0], 10);
                    let part2 = parseInt(parts[1], 10);
                    let month = part1;
                    let day = part2;
                    if (part1 > 12) {
                        day = part1;
                        month = part2;
                    }
                    isoDate = `${baseYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                }

                let dayTitle = clean
                    .replace(/^[0-9+️⃣.\-)*\s]+/, '')
                    .replace(/\*([^*]+)\*/g, '$1')
                    .replace(/^[^\s]+ \d{1,2}[-/]\d{1,2}[:\-]*\s*/, '')
                    .trim();

                parsedDays.push({
                    date: isoDate,
                    dayTitle: dayTitle.slice(0, 100) || 'يوم بالخطة',
                    details: clean,
                    linkedEventId: null
                });
            }
        });
    }

    // Ensure all days have a valid title
    parsedDays.forEach((day, idx) => {
        if (!day.dayTitle || !day.dayTitle.trim()) {
            day.dayTitle = `يوم خدمة ${idx + 1}`;
        }
    });

    return parsedDays;
}

// --- HERO PLAN & NOTEBOOK SHOWCASE ---
export function renderPlanAndNotebookHero() {
    const plan = AppStore.activePlan;
    if (!plan) return;

    const planHeroTitle = document.getElementById('planHeroTitle');
    const planHeroDates = document.getElementById('planHeroDates');
    const planWhatsAppFormattedText = document.getElementById('planWhatsAppFormattedText');
    const planScheduledDaysPillsContainer = document.getElementById('planScheduledDaysPillsContainer');

    const notebookHeroTitle = document.getElementById('notebookHeroTitle');
    const notebookHeroContent = document.getElementById('notebookHeroContent');
    const notebookHeroUpdated = document.getElementById('notebookHeroUpdated');

    if (planHeroTitle) planHeroTitle.innerText = plan.title || 'خطة خدمة وسائل الإيضاح';
    if (planHeroDates) {
        if (plan.startDate && plan.endDate) {
            planHeroDates.innerText = `من ${plan.startDate} إلى ${plan.endDate}`;
        } else {
            planHeroDates.innerText = 'أكتوبر ونوفمبر وديسمبر 2026 - يناير 2027';
        }
    }

    if (planWhatsAppFormattedText) {
        planWhatsAppFormattedText.innerHTML = formatPlanTextToHTML(plan.rawWhatsAppText);
    }

    // Notebook
    if (notebookHeroTitle) {
        notebookHeroTitle.innerText = plan.notebookTitle || 'آخر صفحة في الكشكول 📖';
    }
    if (notebookHeroContent) {
        notebookHeroContent.innerText = plan.notebookContent || 'سجل الملاحظات والقرارات الصادرة في آخر اجتماع للأسرة...';
    }
    if (notebookHeroUpdated && plan.notebookLastUpdated) {
        const d = new Date(plan.notebookLastUpdated);
        notebookHeroUpdated.innerText = `آخر تحديث: ${d.toLocaleDateString('ar-EG')}`;
    }

    // Render interactive scheduled days pills
    if (planScheduledDaysPillsContainer) {
        planScheduledDaysPillsContainer.innerHTML = '';
        const scheduledDays = plan.scheduledDays || [];
        const todayStr = new Date().toISOString().slice(0, 10);
        const fragment = document.createDocumentFragment();

        scheduledDays.forEach(day => {
            const session = AppStore.attendanceSessions[day.date];
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
                statusLabel = 'يوم قادم بالخطة';
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
                if (typeof window.openAttendanceModalForDate === 'function') {
                    window.openAttendanceModalForDate(day.date, day.dayTitle, day.linkedEventId);
                }
            });

            fragment.appendChild(pill);
        });

        planScheduledDaysPillsContainer.appendChild(fragment);
    }
}

// --- MISSED DAYS AUTO DETECTOR ---
export function checkAndRenderMissedDays() {
    const banner = document.getElementById('pendingMissedDaysBanner');
    const badge = document.getElementById('missedDaysCountBadge');
    const container = document.getElementById('missedDaysChipsContainer');

    const missedDays = AppStore.getMissedDays();

    if (missedDays.length === 0) {
        if (banner) banner.classList.add('hidden');
        return;
    }

    if (banner) banner.classList.remove('hidden');
    if (badge) {
        badge.innerText = `${missedDays.length} ${missedDays.length === 1 ? 'يوم فائت' : 'أيام فائتة'}`;
    }

    if (container) {
        container.innerHTML = '';
        const fragment = document.createDocumentFragment();

        missedDays.forEach(day => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95';
            chip.innerHTML = `
                <span>⚠️ ${escapeHTML(day.date)}: ${escapeHTML(day.dayTitle || 'غياب فائت')}</span>
                <span class="text-[10px] underline">اضغط لأخذ الغياب ✍️</span>
            `;
            chip.addEventListener('click', () => {
                if (typeof window.openAttendanceModalForDate === 'function') {
                    window.openAttendanceModalForDate(day.date, day.dayTitle, day.linkedEventId);
                }
            });
            fragment.appendChild(chip);
        });

        container.appendChild(fragment);
    }
}

// --- MODAL DAY ROWS RENDERER ---
function renderScheduledDaysInModal(days) {
    const list = document.getElementById('scheduledDaysListContainer');
    const count = document.getElementById('scheduledDaysCount');
    if (!list) return;
    list.innerHTML = '';
    if (count) count.innerText = days.length;

    const fragment = document.createDocumentFragment();

    days.forEach((day, index) => {
        const row = document.createElement('div');
        row.className = 'flex items-center gap-2 p-2 rounded-xl bg-white/10 border border-white/10 text-xs';
        row.innerHTML = `
            <input type="date" value="${escapeHTML(day.date)}" class="plan-day-date-input form-input text-xs py-1 px-2 w-32 rounded-lg" data-index="${index}">
            <input type="text" value="${escapeHTML(day.dayTitle)}" placeholder="عنوان اليوم / النشاط..." class="plan-day-title-input form-input text-xs py-1 px-2 flex-grow rounded-lg" data-index="${index}">
            <button type="button" class="remove-plan-day-btn text-red-500 hover:text-red-700 font-bold px-2 py-1 text-sm cursor-pointer" data-index="${index}" title="حذف">&times;</button>
        `;

        row.querySelector('.remove-plan-day-btn').addEventListener('click', () => {
            days.splice(index, 1);
            renderScheduledDaysInModal(days);
        });

        fragment.appendChild(row);
    });

    list.appendChild(fragment);
}

// --- PLAN & NOTEBOOK MODULE INITIALIZER ---
export function initPlanAndNotebook() {
    const copyPlanBtn = document.getElementById('copyPlanWhatsAppBtn');
    const openEditPlanBtn = document.getElementById('openEditPlanModalBtn');
    const closePlanModalX = document.getElementById('closePlanModalXBtn');
    const cancelPlanBtn = document.getElementById('cancelPlanModalBtn');
    const parseBtn = document.getElementById('parseWhatsAppPlanBtn');
    const addDayBtn = document.getElementById('addNewScheduledDayBtn');
    const savePlanBtn = document.getElementById('savePlanModalBtn');

    const quickEditNotebookBtn = document.getElementById('quickEditNotebookBtn');
    const closeNotebookX = document.getElementById('closeNotebookQuickXBtn');
    const cancelNotebookBtn = document.getElementById('cancelQuickNotebookBtn');
    const saveNotebookBtn = document.getElementById('saveQuickNotebookBtn');

    const openExtraDayBtn = document.getElementById('openExtraDayModalBtn');
    const closeExtraDayX = document.getElementById('closeExtraDayXBtn');
    const cancelExtraDayBtn = document.getElementById('cancelExtraDayBtn');
    const confirmExtraDayBtn = document.getElementById('confirmExtraDayBtn');

    let modalWorkingDays = [];

    // Copy Plan Button
    if (copyPlanBtn) {
        copyPlanBtn.addEventListener('click', () => {
            const raw = AppStore.activePlan?.rawWhatsAppText;
            if (!raw || !raw.trim()) {
                showToast('لا توجد خطة مسجلة بعد للنسخ', true);
                return;
            }
            navigator.clipboard.writeText(raw).then(() => {
                showToast('تم نسخ نص الخطة إلى الحافظة بنجاح! 📋');
            }).catch(() => {
                showToast('تعذر النسخ التلقائي، يمكنك نسخ النص يدوياً', true);
            });
        });
    }

    // Open Edit Plan Modal
    if (openEditPlanBtn) {
        openEditPlanBtn.addEventListener('click', () => {
            const plan = AppStore.activePlan;
            if (plan) {
                const titleInput = document.getElementById('planTitleInput');
                const startInput = document.getElementById('planStartDateInput');
                const endInput = document.getElementById('planEndDateInput');
                const rawInput = document.getElementById('planRawTextInput');

                if (titleInput) titleInput.value = plan.title || '';
                if (startInput) startInput.value = plan.startDate || '';
                if (endInput) endInput.value = plan.endDate || '';
                if (rawInput) rawInput.value = plan.rawWhatsAppText || '';

                modalWorkingDays = JSON.parse(JSON.stringify(plan.scheduledDays || []));
                renderScheduledDaysInModal(modalWorkingDays);
            }
            openModal('planModal');
        });
    }

    if (closePlanModalX) closePlanModalX.addEventListener('click', () => closeModal('planModal'));
    if (cancelPlanBtn) cancelPlanBtn.addEventListener('click', () => closeModal('planModal'));

    // Auto Parse Plan
    if (parseBtn) {
        parseBtn.addEventListener('click', () => {
            const rawInput = document.getElementById('planRawTextInput');
            const raw = rawInput ? rawInput.value : '';
            if (!raw.trim()) {
                showToast('يرجى إدخال أو لصق نص الخطة أولاً في الحقل', true);
                return;
            }
            const parsed = parseWhatsAppPlanText(raw);
            if (parsed.length === 0) {
                showToast('لم يتم العثور على تواريخ واضحة، يمكنك إضافة الأيام يدوياً', true);
            } else {
                modalWorkingDays = parsed;
                renderScheduledDaysInModal(modalWorkingDays);
                showToast(`تم استخراج ${parsed.length} أيام بنجاح من الخطة! ⚡`);
            }
        });
    }

    // Add Scheduled Day Manually
    if (addDayBtn) {
        addDayBtn.addEventListener('click', () => {
            const todayStr = new Date().toISOString().slice(0, 10);
            modalWorkingDays.push({
                date: todayStr,
                dayTitle: 'موضوع الاجتماع / الورشة',
                details: '',
                linkedEventId: null
            });
            renderScheduledDaysInModal(modalWorkingDays);
        });
    }

    // Save Plan Modal
    if (savePlanBtn) {
        savePlanBtn.addEventListener('click', async () => {
            const titleInput = document.getElementById('planTitleInput');
            const startInput = document.getElementById('planStartDateInput');
            const endInput = document.getElementById('planEndDateInput');
            const rawInput = document.getElementById('planRawTextInput');

            // Read live values from modal inputs
            const updatedDays = [];
            const rows = document.querySelectorAll('#scheduledDaysListContainer .flex');
            rows.forEach(r => {
                const dateVal = r.querySelector('.plan-day-date-input')?.value;
                const titleVal = r.querySelector('.plan-day-title-input')?.value;
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
                id: AppStore.activePlan?.id || 'plan-' + Date.now(),
                title: titleInput?.value || 'الخطة الأسبوعية',
                startDate: startInput?.value || '',
                endDate: endInput?.value || '',
                rawWhatsAppText: rawInput?.value || '',
                scheduledDays: updatedDays,
                notebookTitle: AppStore.activePlan?.notebookTitle || 'آخر صفحة في الكشكول 📖',
                notebookContent: AppStore.activePlan?.notebookContent || '',
                notebookLastUpdated: new Date().toISOString()
            };

            await AppStore.savePlan(payload);
            closeModal('planModal');
            showToast('تم حفظ واعتماد الخطة بنجاح! 💾');
        });
    }

    // Notebook Quick Edit
    if (quickEditNotebookBtn) {
        quickEditNotebookBtn.addEventListener('click', () => {
            const tInput = document.getElementById('quickNotebookTitleInput');
            const cInput = document.getElementById('quickNotebookContentInput');
            if (tInput) tInput.value = AppStore.activePlan?.notebookTitle || '';
            if (cInput) cInput.value = AppStore.activePlan?.notebookContent || '';
            openModal('notebookQuickModal');
        });
    }

    if (closeNotebookX) closeNotebookX.addEventListener('click', () => closeModal('notebookQuickModal'));
    if (cancelNotebookBtn) cancelNotebookBtn.addEventListener('click', () => closeModal('notebookQuickModal'));

    if (saveNotebookBtn) {
        saveNotebookBtn.addEventListener('click', async () => {
            const tInput = document.getElementById('quickNotebookTitleInput');
            const cInput = document.getElementById('quickNotebookContentInput');
            await AppStore.updateNotebook(tInput?.value || '', cInput?.value || '');
            closeModal('notebookQuickModal');
            showToast('تم حفظ صفحة الكشكول بنجاح! 📖');
        });
    }

    // Extra Day Modal
    if (openExtraDayBtn) {
        openExtraDayBtn.addEventListener('click', () => {
            const dateInput = document.getElementById('extraDayDateInput');
            const titleInput = document.getElementById('extraDayTitleInput');
            if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
            if (titleInput) titleInput.value = '';
            openModal('extraDayModal');
        });
    }

    if (closeExtraDayX) closeExtraDayX.addEventListener('click', () => closeModal('extraDayModal'));
    if (cancelExtraDayBtn) cancelExtraDayBtn.addEventListener('click', () => closeModal('extraDayModal'));

    if (confirmExtraDayBtn) {
        confirmExtraDayBtn.addEventListener('click', () => {
            const dateInput = document.getElementById('extraDayDateInput');
            const titleInput = document.getElementById('extraDayTitleInput');
            const typeSelect = document.getElementById('extraDayTypeSelect');

            const dateVal = dateInput?.value;
            const titleVal = titleInput?.value || 'يوم إضافي (خارج الخطة)';
            const dayTypeVal = typeSelect?.value || 'meeting';

            if (!dateVal) {
                showToast('يرجى تحديد التاريخ', true);
                return;
            }

            closeModal('extraDayModal');
            if (typeof window.openAttendanceModalForDate === 'function') {
                window.openAttendanceModalForDate(dateVal, titleVal, null, dayTypeVal);
            }
        });
    }

    // Subscribe to AppStore changes to re-render
    AppStore.subscribe(() => {
        renderPlanAndNotebookHero();
        checkAndRenderMissedDays();
    });

    renderPlanAndNotebookHero();
    checkAndRenderMissedDays();
}
