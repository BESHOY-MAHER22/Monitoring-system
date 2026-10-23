// js/store.js - Central State Management, API Sync & Pure Business Logic Engine
const API_URL = '/api';

class Store {
    constructor() {
        this.people = [];
        this.activePlan = null;
        this.attendanceSessions = {};
        this.tasks = [];
        this.events = [];
        this.subscribers = new Set();
        this.isLoaded = false;
        this.isLoading = false;

        // Memoization cache for heavy attendance math
        this._memoizedStats = null;
        this._isDirty = true;
    }

    subscribe(callback) {
        if (typeof callback === 'function') {
            this.subscribers.add(callback);
        }
        return () => this.subscribers.delete(callback);
    }

    notify() {
        this._isDirty = true;
        this._memoizedStats = null;
        for (const cb of this.subscribers) {
            try {
                cb(this);
            } catch (err) {
                console.error('Store subscriber notification error:', err);
            }
        }
    }

    // --- 1. DATA SYNC & LOCAL STORAGE FALLBACK ---
    async loadAllData() {
        if (this.isLoading) return;
        this.isLoading = true;

        try {
            this._hydrateFromLocalStorage();

            // Fetch Plan
            try {
                const planRes = await fetch(`${API_URL}/plan`);
                if (planRes.ok) {
                    const pData = await planRes.json();
                    if (pData?.activePlan) {
                        this.activePlan = pData.activePlan;
                        if (!Array.isArray(this.activePlan.scheduledDays)) {
                            this.activePlan.scheduledDays = [];
                        }
                    }
                }
            } catch (e) {
                console.warn('API Plan fetch notice:', e);
            }

            // Fetch Attendance Sessions
            try {
                const sessRes = await fetch(`${API_URL}/attendance-sessions`);
                if (sessRes.ok) {
                    const sData = await sessRes.json();
                    if (sData?.attendanceSessions) {
                        this.attendanceSessions = sData.attendanceSessions;
                    }
                }
            } catch (e) {
                console.warn('API Sessions fetch notice:', e);
            }

            // Fetch People (Strictly unified role: servant)
            try {
                const peopleRes = await fetch(`${API_URL}/people`);
                if (peopleRes.ok) {
                    const peoData = await peopleRes.json();
                    if (Array.isArray(peoData.people)) {
                        this.people = peoData.people.map(p => ({
                            ...p,
                            role: 'servant'
                        }));
                    }
                }
            } catch (e) {
                console.warn('API People fetch notice:', e);
            }

            // Fetch Tasks
            try {
                const tasksRes = await fetch(`${API_URL}/tasks`);
                if (tasksRes.ok) {
                    const tData = await tasksRes.json();
                    this.tasks = Array.isArray(tData) ? tData : (tData?.tasks || []);
                }
            } catch (e) {
                console.warn('API Tasks fetch notice:', e);
            }

            // Fetch Events
            try {
                const eventsRes = await fetch(`${API_URL}/events`);
                if (eventsRes.ok) {
                    const evData = await eventsRes.json();
                    this.events = Array.isArray(evData) ? evData : (evData?.events || []);
                }
            } catch (e) {
                console.warn('API Events fetch notice:', e);
            }

            this.isLoaded = true;
            this._persistToLocalStorage();
            this.notify();
            return true;
        } catch (err) {
            console.error('Store loadAllData failure:', err);
            this.isLoaded = true;
            this.notify();
            return false;
        } finally {
            this.isLoading = false;
        }
    }

    _hydrateFromLocalStorage() {
        try {
            const raw = localStorage.getItem('app_state_backup');
            if (!raw) return;
            const backup = JSON.parse(raw);
            if (Array.isArray(backup.people) && this.people.length === 0) this.people = backup.people;
            if (backup.activePlan && !this.activePlan) this.activePlan = backup.activePlan;
            if (backup.attendanceSessions && Object.keys(this.attendanceSessions).length === 0) this.attendanceSessions = backup.attendanceSessions;
            if (Array.isArray(backup.tasks) && this.tasks.length === 0) this.tasks = backup.tasks;
            if (Array.isArray(backup.events) && this.events.length === 0) this.events = backup.events;
        } catch (e) {
            console.warn('LocalStorage hydration notice:', e);
        }
    }

    _persistToLocalStorage() {
        try {
            const payload = {
                people: this.people,
                activePlan: this.activePlan,
                attendanceSessions: this.attendanceSessions,
                tasks: this.tasks,
                events: this.events,
                timestamp: Date.now()
            };
            localStorage.setItem('app_state_backup', JSON.stringify(payload));
        } catch (e) {
            console.warn('LocalStorage persist notice:', e);
        }
    }

    // --- 2. PURE BUSINESS LOGIC & ATTENDANCE FORMULAS ---
    getPeopleWithStats() {
        if (!this._isDirty && Array.isArray(this._memoizedStats)) {
            return this._memoizedStats;
        }

        const sessions = Object.values(this.attendanceSessions || {});
        const result = (this.people || []).map(person => {
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

            // Net Commitment Formula: ((Present + Excused) / Total Sessions) * 100
            const requiredSessions = totalSessions;
            const commitmentRatio = totalSessions === 0 ? 0 : (attendedSessions + excusedSessions) / totalSessions;
            const attendanceRatio = totalSessions === 0 ? 0 : attendedSessions / totalSessions;

            // Consecutive unexcused absences
            let consecutiveAbsences = 0;
            for (const session of virtualAttendance) {
                if (!session.status && !session.excused) {
                    consecutiveAbsences++;
                } else {
                    break;
                }
            }

            const personTasks = (this.tasks || []).filter(t => t.personId === person.id);
            const totalTasks = personTasks.length;
            const completedTasks = personTasks.filter(t => t.status === 'completed').length;
            const taskRatio = totalTasks === 0 ? 0 : completedTasks / totalTasks;

            // Overload ⚡: Attendance exceeding event target count
            let totalOverload = 0;
            (this.events || []).forEach(ev => {
                const target = ev.targetCount || 2;
                const count = virtualAttendance.filter(s => s.status && (s.eventId === ev.id || (s.dayName && s.dayName.includes(ev.name)))).length;
                if (count > target) {
                    totalOverload += (count - target);
                }
            });

            const needsFollowUp = unexcusedSessions > 0;

            return {
                ...person,
                role: 'servant',
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

        this._memoizedStats = result;
        this._isDirty = false;
        return result;
    }

    getServantStats(personId) {
        return this.getPeopleWithStats().find(p => p.id === personId) || null;
    }

    getOverallMetrics() {
        const stats = this.getPeopleWithStats();
        const total = stats.length;
        if (total === 0) {
            return {
                totalServants: 0,
                avgCommitmentPct: 0,
                avgAttendancePct: 0,
                urgentFollowupCount: 0,
                perfectAttendanceCount: 0,
                totalUnexcused: 0,
                totalExcused: 0
            };
        }

        const totalCommitmentSum = stats.reduce((acc, p) => acc + (p.commitmentRatio || 0), 0);
        const totalAttendanceSum = stats.reduce((acc, p) => acc + (p.attendanceRatio || 0), 0);
        const urgentCount = stats.filter(p => p.needsFollowUp).length;
        const perfectCount = stats.filter(p => p.commitmentRatio === 1 && p.totalSessions > 0).length;
        const totalUnexcused = stats.reduce((acc, p) => acc + p.unexcusedSessions, 0);
        const totalExcused = stats.reduce((acc, p) => acc + p.excusedSessions, 0);

        return {
            totalServants: total,
            avgCommitmentPct: Math.round((totalCommitmentSum / total) * 100),
            avgAttendancePct: Math.round((totalAttendanceSum / total) * 100),
            urgentFollowupCount: urgentCount,
            perfectAttendanceCount: perfectCount,
            totalUnexcused,
            totalExcused
        };
    }

    getMissedDays() {
        if (!this.activePlan || !Array.isArray(this.activePlan.scheduledDays)) {
            return [];
        }
        const todayStr = new Date().toISOString().slice(0, 10);
        return this.activePlan.scheduledDays.filter(day => {
            if (day.date > todayStr) return false;
            const session = this.attendanceSessions[day.date];
            return !session || !session.isCompleted;
        });
    }

    // --- 3. MUTATIONS ---
    async saveAttendanceSession(dateStr, titleStr, recordsMap, source = 'plan', linkedEventId = null, dayType = 'meeting') {
        const payload = {
            date: dateStr,
            title: titleStr,
            source: source,
            linkedEventId: linkedEventId,
            dayType: dayType,
            isCompleted: true,
            records: recordsMap
        };

        this.attendanceSessions[dateStr] = payload;
        this.notify();
        this._persistToLocalStorage();

        try {
            const res = await fetch(`${API_URL}/attendance-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return res.ok;
        } catch (e) {
            console.warn('Sync session fallback:', e);
            return true;
        }
    }

    async createPerson(name, role = 'servant', birthdate = '', notes = '') {
        const tempId = 'p_' + Date.now();
        const newPerson = { id: tempId, name, role: 'servant', birthdate, notes };

        this.people.push(newPerson);
        this.notify();
        this._persistToLocalStorage();

        try {
            const res = await fetch(`${API_URL}/people`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, role: 'servant', birthdate, notes })
            });
            if (res.ok) {
                const data = await res.json();
                const idx = this.people.findIndex(p => p.id === tempId);
                if (idx !== -1 && data.person) this.people[idx] = data.person;
                this.notify();
                this._persistToLocalStorage();
                return data.person;
            }
            return newPerson;
        } catch (e) {
            return newPerson;
        }
    }

    async updatePersonName(personId, newName) {
        const person = this.people.find(p => p.id === personId);
        if (!person) return false;
        const oldName = person.name;
        person.name = newName;
        this.notify();
        this._persistToLocalStorage();

        try {
            const res = await fetch(`${API_URL}/people/${personId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName, role: 'servant' })
            });
            if (!res.ok) throw new Error('Update failed');
            return true;
        } catch (e) {
            person.name = oldName;
            this.notify();
            return false;
        }
    }

    async deletePerson(personId) {
        const prev = [...this.people];
        this.people = this.people.filter(p => p.id !== personId);
        this.notify();
        this._persistToLocalStorage();

        try {
            const res = await fetch(`${API_URL}/people/${personId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            return true;
        } catch (e) {
            this.people = prev;
            this.notify();
            return false;
        }
    }

    async savePlan(planData) {
        this.activePlan = planData;
        this.notify();
        this._persistToLocalStorage();

        try {
            const res = await fetch(`${API_URL}/plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(planData)
            });
            if (res.ok) {
                const data = await res.json();
                if (data.activePlan) this.activePlan = data.activePlan;
                this.notify();
                this._persistToLocalStorage();
                return true;
            }
            return false;
        } catch (e) {
            return true;
        }
    }

    async updateNotebook(title, content) {
        if (!this.activePlan) return false;
        this.activePlan.notebookTitle = title;
        this.activePlan.notebookContent = content;
        this.activePlan.notebookLastUpdated = new Date().toISOString();
        this.notify();
        this._persistToLocalStorage();

        try {
            await fetch(`${API_URL}/plan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.activePlan)
            });
            return true;
        } catch (e) {
            return true;
        }
    }

    async createTask(taskData) {
        const tempId = 't_' + Date.now();
        const task = { id: tempId, ...taskData, status: taskData.status || 'pending' };
        this.tasks.push(task);
        this.notify();
        this._persistToLocalStorage();

        try {
            const res = await fetch(`${API_URL}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
            if (res.ok) {
                const data = await res.json();
                const idx = this.tasks.findIndex(t => t.id === tempId);
                if (idx !== -1 && data.task) this.tasks[idx] = data.task;
                this.notify();
                this._persistToLocalStorage();
                return true;
            }
            return false;
        } catch (e) {
            return true;
        }
    }

    async updateTask(taskId, taskData) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return false;
        Object.assign(task, taskData);
        this.notify();
        this._persistToLocalStorage();

        try {
            await fetch(`${API_URL}/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
            return true;
        } catch (e) {
            return true;
        }
    }

    async cycleTaskStatus(taskId) {
        const nextMap = {
            'pending': 'in-progress',
            'in-progress': 'completed',
            'completed': 'not-completed',
            'not-completed': 'pending'
        };
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;
        const oldStatus = task.status;
        const newStatus = nextMap[oldStatus] || 'pending';

        task.status = newStatus;
        this.notify();
        this._persistToLocalStorage();

        try {
            const res = await fetch(`${API_URL}/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: task.description,
                    personId: task.personId,
                    date: task.date,
                    status: newStatus
                })
            });
            if (!res.ok) throw new Error('Task cycle failed');
            return newStatus;
        } catch (e) {
            task.status = oldStatus;
            this.notify();
            throw e;
        }
    }

    async deleteTask(taskId) {
        const prev = [...this.tasks];
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.notify();
        this._persistToLocalStorage();

        try {
            const res = await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Task delete failed');
            return true;
        } catch (e) {
            this.tasks = prev;
            this.notify();
            return false;
        }
    }

    async createEvent(eventData) {
        const tempId = 'ev_' + Date.now();
        const ev = { id: tempId, ...eventData };
        this.events.push(ev);
        this.notify();
        this._persistToLocalStorage();

        try {
            const res = await fetch(`${API_URL}/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData)
            });
            if (res.ok) {
                const data = await res.json();
                const idx = this.events.findIndex(e => e.id === tempId);
                if (idx !== -1 && data.event) this.events[idx] = data.event;
                this.notify();
                this._persistToLocalStorage();
                return true;
            }
            return false;
        } catch (e) {
            return true;
        }
    }

    async deleteEvent(eventId) {
        const prev = [...this.events];
        this.events = this.events.filter(e => e.id !== eventId);
        this.notify();
        this._persistToLocalStorage();

        try {
            const res = await fetch(`${API_URL}/events/${eventId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Event delete failed');
            return true;
        } catch (e) {
            this.events = prev;
            this.notify();
            return false;
        }
    }
}

export const AppStore = new Store();
window.AppStore = AppStore;
