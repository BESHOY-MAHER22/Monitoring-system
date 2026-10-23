// js/analytics.js - Servant Chart.js Visual Analytics & Memory Lifecycle Management
import { AppStore } from './store.js';
import { escapeHTML, openModal, closeModal } from './ui.js';

// Global Chart Registry
window.activeServantCharts = window.activeServantCharts || {};

export function destroyAllActiveServantCharts() {
    if (window.activeServantCharts) {
        Object.keys(window.activeServantCharts).forEach(k => {
            if (window.activeServantCharts[k] && typeof window.activeServantCharts[k].destroy === 'function') {
                try {
                    window.activeServantCharts[k].destroy();
                } catch (e) {
                    console.warn('Chart destroy error:', e);
                }
            }
            delete window.activeServantCharts[k];
        });
    }
}
window.destroyAllActiveServantCharts = destroyAllActiveServantCharts;

export function openPersonAnalyticsModal(personId) {
    const person = AppStore.getServantStats(personId);
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

    // Safely destroy previous charts
    destroyAllActiveServantCharts();

    if (typeof Chart !== 'undefined') {
        try {
            // Chart 1: Doughnut (Present, Excused, Absent)
            const doughnutCanvas = document.getElementById('attendanceDoughnutChart');
            if (doughnutCanvas) {
                window.activeServantCharts.personAttendance = new Chart(doughnutCanvas, {
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

            // Chart 2: Events & Overload Bar Chart
            const eventsCanvas = document.getElementById('eventsBarChart');
            if (eventsCanvas) {
                const eventLabels = (AppStore.events || []).map(e => e.name);
                const eventData = (AppStore.events || []).map(ev => {
                    return (person.attendance || []).filter(s => s.status && (s.eventId === ev.id || (s.dayName && s.dayName.includes(ev.name)))).length;
                });

                window.activeServantCharts.personEvents = new Chart(eventsCanvas, {
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

            // Chart 3: Tasks Status Breakdown
            const tasksCanvas = document.getElementById('tasksStatusChart');
            if (tasksCanvas) {
                const personTasksList = (AppStore.tasks || []).filter(t => t.personId === person.id);
                const countPending = personTasksList.filter(t => t.status === 'pending').length;
                const countInProgress = personTasksList.filter(t => t.status === 'in-progress').length;
                const countCompleted = personTasksList.filter(t => t.status === 'completed').length;
                const countNotCompleted = personTasksList.filter(t => t.status === 'not-completed').length;

                window.activeServantCharts.personTasks = new Chart(tasksCanvas, {
                    type: 'doughnut',
                    data: {
                        labels: ['قيد الانتظار ⏳', 'قيد التنفيذ ⚙️', 'منجزة ✅', 'لم تُنجز ❌'],
                        datasets: [{
                            data: [countPending, countInProgress, countCompleted, countNotCompleted],
                            backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'],
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

            // Chart 4: Monthly Commitment Timeline
            const timelineCanvas = document.getElementById('monthlyTimelineChart');
            if (timelineCanvas) {
                const monthsMap = {};
                (person.attendance || []).forEach(sess => {
                    if (!sess.date) return;
                    const mKey = sess.date.slice(0, 7);
                    if (!monthsMap[mKey]) monthsMap[mKey] = { total: 0, committed: 0 };
                    monthsMap[mKey].total++;
                    if (sess.status || sess.excused) monthsMap[mKey].committed++;
                });

                const sortedMonths = Object.keys(monthsMap).sort();
                const monthLabels = sortedMonths.length ? sortedMonths : ['أكتوبر 2026'];
                const monthData = sortedMonths.length
                    ? sortedMonths.map(m => Math.round((monthsMap[m].committed / monthsMap[m].total) * 100))
                    : [Math.round((person.commitmentRatio || 0) * 100)];

                window.activeServantCharts.personTimeline = new Chart(timelineCanvas, {
                    type: 'line',
                    data: {
                        labels: monthLabels,
                        datasets: [{
                            label: 'نسبة الالتزام بالعذر %',
                            data: monthData,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            fill: true,
                            tension: 0.35,
                            pointRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true, max: 100 } }
                    }
                });
            }

            // Deep-Dive Specific Event Selector & Chart
            const eventSelect = document.getElementById('analyticsEventSelect');
            if (eventSelect && AppStore.events.length > 0) {
                eventSelect.innerHTML = AppStore.events.map(ev => `<option value="${ev.id}">${escapeHTML(ev.name)}</option>`).join('');

                const renderSpecificEventChart = (evId) => {
                    const selectedEvent = AppStore.events.find(e => e.id === evId) || AppStore.events[0];
                    if (!selectedEvent) return;
                    const specificCanvas = document.getElementById('specificEventChart');
                    if (!specificCanvas) return;

                    if (window.activeServantCharts.personSpecificEvent) {
                        try {
                            window.activeServantCharts.personSpecificEvent.destroy();
                        } catch (e) { }
                        delete window.activeServantCharts.personSpecificEvent;
                    }

                    const targetCount = selectedEvent.targetCount || 2;
                    const attendedCount = (person.attendance || []).filter(s => s.status && (s.eventId === selectedEvent.id || (s.dayName && s.dayName.includes(selectedEvent.name)))).length;
                    const normalAttendance = Math.min(attendedCount, targetCount);
                    const overloadAttendance = Math.max(0, attendedCount - targetCount);
                    const remainingToTarget = Math.max(0, targetCount - attendedCount);

                    window.activeServantCharts.personSpecificEvent = new Chart(specificCanvas, {
                        type: 'doughnut',
                        data: {
                            labels: ['حضور أساسي', 'Overload ⚡', 'متبقي للهدف'],
                            datasets: [{
                                data: [normalAttendance, overloadAttendance, remainingToTarget],
                                backgroundColor: ['#10b981', '#a855f7', '#d1d5db'],
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { position: 'bottom' } }
                        }
                    });
                };

                renderSpecificEventChart(eventSelect.value);
                eventSelect.onchange = (e) => renderSpecificEventChart(e.target.value);
            }
        } catch (chartErr) {
            console.warn('Chart render fallback:', chartErr);
        }
    }

    openModal('personAnalyticsModal');
}
window.openPersonAnalyticsModal = openPersonAnalyticsModal;

export function initAnalyticsCharts() {
    const closeAnalyticsBtn = document.getElementById('closeAnalyticsBtn');
    const closeAnalyticsOkBtn = document.getElementById('closeAnalyticsOkBtn');

    if (closeAnalyticsBtn) {
        closeAnalyticsBtn.addEventListener('click', () => {
            closeModal('personAnalyticsModal');
            destroyAllActiveServantCharts();
        });
    }
    if (closeAnalyticsOkBtn) {
        closeAnalyticsOkBtn.addEventListener('click', () => {
            closeModal('personAnalyticsModal');
            destroyAllActiveServantCharts();
        });
    }
}
