// js/ui.js - Core UI, Universal Modals, Toasts, Theme & 60fps Single-Row Dynamic Island
import { AppStore } from './store.js';

// --- 1. TOAST NOTIFICATIONS ---
export function showToast(message, isError = false) {
    const existing = document.getElementById('systemToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'systemToast';
    toast.className = `fixed bottom-6 right-6 z-[1100] px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md text-white text-xs font-bold transition-all duration-300 transform translate-y-4 opacity-0 flex items-center gap-2 ${
        isError ? 'bg-red-600/90 border border-red-400' : 'bg-emerald-600/90 border border-emerald-400'
    }`;
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
window.showToast = showToast;

// --- 2. ANTI-XSS ESCAPING ---
export function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
window.escapeHTML = escapeHTML;

// --- 3. UNIVERSAL MODAL SYSTEM ---
export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = 'none';

    // If no other modals are open, restore scrolling
    const openModals = document.querySelectorAll('.modal[style*="display: flex"], .modal[style*="display:flex"]');
    if (openModals.length <= 1) {
        document.body.style.overflow = '';
    }

    // If closing analytics modal, destroy active charts cleanly
    if (modalId === 'personAnalyticsModal' && typeof window.destroyAllActiveServantCharts === 'function') {
        window.destroyAllActiveServantCharts();
    }
}
window.openModal = openModal;
window.closeModal = closeModal;

// --- 4. CUSTOM ALERTS & CONFIRMS ---
export function showCustomAlert(message, title = 'تنبيه') {
    return new Promise(resolve => {
        const modal = document.getElementById('customAlertModal');
        const titleEl = document.getElementById('modalTitle');
        const msgEl = document.getElementById('modalMessage');
        const okBtn = document.getElementById('modalOkBtn');
        if (titleEl) titleEl.innerText = title;
        if (msgEl) msgEl.innerText = message;
        if (modal) modal.style.display = 'flex';

        if (okBtn) {
            okBtn.onclick = () => {
                if (modal) modal.style.display = 'none';
                resolve();
            };
        }
    });
}
window.showCustomAlert = showCustomAlert;

export function showCustomConfirm(message, title = 'تأكيد') {
    return new Promise(resolve => {
        const modal = document.getElementById('customConfirmModal');
        const titleEl = document.getElementById('confirmTitle');
        const msgEl = document.getElementById('confirmMessage');
        const yesBtn = document.getElementById('confirmYesBtn');
        const noBtn = document.getElementById('confirmNoBtn');

        if (titleEl) titleEl.innerText = title;
        if (msgEl) msgEl.innerText = message;
        if (modal) modal.style.display = 'flex';

        if (yesBtn) {
            yesBtn.onclick = () => {
                if (modal) modal.style.display = 'none';
                resolve(true);
            };
        }
        if (noBtn) {
            noBtn.onclick = () => {
                if (modal) modal.style.display = 'none';
                resolve(false);
            };
        }
    });
}
window.showCustomConfirm = showCustomConfirm;

// --- 5. THEME & INITIALIZATION ---
export function initTheme() {
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const sunIcon = document.getElementById('sunIcon');
    const moonIcon = document.getElementById('moonIcon');

    const savedTheme = localStorage.getItem('theme');
    const isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
        document.documentElement.classList.add('dark');
        if (sunIcon) sunIcon.classList.remove('hidden');
        if (moonIcon) moonIcon.classList.add('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        if (sunIcon) sunIcon.classList.add('hidden');
        if (moonIcon) moonIcon.classList.remove('hidden');
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const willBeDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', willBeDark ? 'dark' : 'light');
            if (sunIcon && moonIcon) {
                sunIcon.classList.toggle('hidden', !willBeDark);
                moonIcon.classList.toggle('hidden', willBeDark);
            }
        });
    }
}

// --- 6. 60FPS SINGLE-ROW DYNAMIC ISLAND CONTROLLER ---
export function initDynamicIsland() {
    const island = document.getElementById('dynamic-island-wrapper');
    const mainHeader = document.getElementById('mainAppHeader');
    if (!island) return;

    const missedBadge = document.getElementById('islandMissedDaysBadge');
    const searchBtn = document.getElementById('islandSearchBtn');
    const copyPlanBtn = document.getElementById('islandCopyPlanBtn');
    const scrollTopBtn = document.getElementById('islandScrollTopBtn');
    const logoBadge = document.getElementById('islandLogoBadge');
    const scrollToTopFloating = document.getElementById('scrollToTopBtn');

    // 1. Smooth 60fps Scroll Trigger (Boolean flag avoids per-pixel classList operations)
    let isIslandVisible = false;
    let scrollRafId = null;

    window.addEventListener('scroll', () => {
        if (scrollRafId !== null) return;
        scrollRafId = window.requestAnimationFrame(() => {
            const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
            const shouldBeVisible = scrollY > 180;

            if (shouldBeVisible !== isIslandVisible) {
                isIslandVisible = shouldBeVisible;
                if (isIslandVisible) {
                    if (mainHeader) mainHeader.classList.add('header-hidden');
                    island.classList.add('island-visible');
                    if (scrollToTopFloating) {
                        scrollToTopFloating.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-6');
                        scrollToTopFloating.classList.add('opacity-100', 'pointer-events-auto', 'translate-y-0');
                    }
                } else {
                    if (mainHeader) mainHeader.classList.remove('header-hidden');
                    island.classList.remove('island-visible');
                    if (scrollToTopFloating) {
                        scrollToTopFloating.classList.add('opacity-0', 'pointer-events-none', 'translate-y-6');
                        scrollToTopFloating.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0');
                    }
                }
            }
            scrollRafId = null;
        });
    }, { passive: true });

    // 2. Action: Missed Days Badge Click -> Open Attendance Sheet for next pending day
    if (missedBadge) {
        missedBadge.addEventListener('click', (e) => {
            e.stopPropagation();
            const missedDays = AppStore.getMissedDays();
            if (missedDays.length > 0) {
                const targetDay = missedDays[0];
                if (typeof window.openAttendanceModalForDate === 'function') {
                    window.openAttendanceModalForDate(targetDay.date, targetDay.dayTitle, targetDay.linkedEventId);
                }
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

    // 4. Action: Direct Copy Plan Text
    if (copyPlanBtn) {
        copyPlanBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const rawPlan = AppStore.activePlan?.rawWhatsAppText;
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
    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (scrollTopBtn) scrollTopBtn.addEventListener('click', scrollToTop);
    if (logoBadge) logoBadge.addEventListener('click', scrollToTop);
    if (scrollToTopFloating) scrollToTopFloating.addEventListener('click', scrollToTop);

    // 6. Reactive Sync Function
    function syncDynamicIsland() {
        const titleEl = document.getElementById('islandPlanTitle');
        const missedText = document.getElementById('islandMissedDaysText');
        const missedBadgeEl = document.getElementById('islandMissedDaysBadge');
        const statusDot = document.getElementById('islandStatusDot');
        const attendText = document.getElementById('islandAttendanceText');
        const peopleText = document.getElementById('islandPeopleText');

        // Title
        if (titleEl) {
            titleEl.innerText = AppStore.activePlan?.title || 'أسرة الأنبا أرسانيوس';
        }

        // Missed Days
        const missedDays = AppStore.getMissedDays();
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

        if (statusDot) {
            if (missedCount > 0) {
                statusDot.className = 'island-status-pulse amber';
                statusDot.title = `تنبيه: يوجد ${missedCount} أيام معلقة بالخطة`;
            } else {
                statusDot.className = 'island-status-pulse green';
                statusDot.title = 'ممتاز: جميع أيام الخطة مسجلة بنجاح';
            }
        }

        // Live Overall Metrics
        const metrics = AppStore.getOverallMetrics();
        if (attendText) attendText.innerText = `${metrics.avgAttendancePct}%`;
        if (peopleText) peopleText.innerText = `${metrics.totalServants} فرد`;
    }

    AppStore.subscribe(syncDynamicIsland);
    syncDynamicIsland();
}

export function initGlobalModalsDismiss() {
    // Backdrop click
    window.addEventListener('click', (e) => {
        if (e.target && e.target.classList && e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            document.body.style.overflow = '';
            if (e.target.id === 'personAnalyticsModal' && typeof window.destroyAllActiveServantCharts === 'function') {
                window.destroyAllActiveServantCharts();
            }
        }
    });

    // Escape key closes open modals
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal[style*="display: flex"], .modal[style*="display:flex"]');
            openModals.forEach(m => {
                m.style.display = 'none';
                if (m.id === 'personAnalyticsModal' && typeof window.destroyAllActiveServantCharts === 'function') {
                    window.destroyAllActiveServantCharts();
                }
            });
            document.body.style.overflow = '';
        }
    });
}
