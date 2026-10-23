// app.js - Master Orchestrator (ES6 Modular Architecture & Global Event Delegation)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

import { AppStore } from './js/store.js';
import { initTheme, initDynamicIsland, initGlobalModalsDismiss, showToast, openModal, closeModal } from './js/ui.js';
import { initPlanAndNotebook, renderPlanAndNotebookHero, checkAndRenderMissedDays } from './js/plan.js';
import { initServantsAndAttendance, renderCardsFromStore, renderDaysList } from './js/servants.js';
import { initAnalyticsCharts } from './js/analytics.js';
import { initTasksEventsReports, renderTasksList, renderEventsList } from './js/tasks-events.js';

// --- OPTIONAL FIREBASE INITIALIZATION ---
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

try {
    const firebaseApp = initializeApp(firebaseConfig);
    getAuth(firebaseApp);
    getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
} catch (e) {
    console.warn('Firebase init notice (local Express API active):', e);
}

// --- UNIFIED MASTER RENDER DISPATCHER ---
export function renderForAll() {
    renderPlanAndNotebookHero();
    checkAndRenderMissedDays();
    renderCardsFromStore();
    renderDaysList();
    renderTasksList();
    renderEventsList();
}
window.renderForAll = renderForAll;

// --- GLOBAL EVENT DELEGATION ROUTER ---
function initGlobalEventDelegation() {
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (!target) return;

        // 1. Data-action delegation
        const actionEl = target.closest('[data-action]');
        if (actionEl) {
            const action = actionEl.dataset.action;
            switch (action) {
                case 'open-plan-modal':
                    openModal('planModal');
                    break;
                case 'close-plan-modal':
                    closeModal('planModal');
                    break;
                case 'open-add-person':
                    openModal('addPersonModal');
                    break;
                case 'close-add-person':
                    closeModal('addPersonModal');
                    break;
                case 'clear-search':
                    if (typeof window.clearPersonSearchAndFocus === 'function') {
                        window.clearPersonSearchAndFocus();
                    }
                    break;
                case 'scroll-top':
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    break;
            }
        }
    });
}

// --- CONNECTION STATUS UPDATE ---
function updateConnectionStatus(isOnline) {
    const dot = document.getElementById('connectionStatus');
    const text = document.getElementById('connectionText');
    if (dot) {
        if (isOnline) {
            dot.classList.add('online');
        } else {
            dot.classList.remove('online');
        }
    }
    if (text) {
        text.innerText = isOnline ? 'متصل سحابياً ⚡' : 'سيرفر محلي';
    }
}

// --- BOOTSTRAP APP SEQUENCE ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Core theme & modals
    initTheme();
    initGlobalModalsDismiss();
    initGlobalEventDelegation();

    // 2. Initialize feature modules
    initDynamicIsland();
    initPlanAndNotebook();
    initServantsAndAttendance();
    initAnalyticsCharts();
    initTasksEventsReports();

    // 3. Initial View Render from existing local cache
    renderForAll();

    // 4. Fetch latest server state & sync
    const success = await AppStore.loadAllData();
    updateConnectionStatus(success);
    renderForAll();
});
