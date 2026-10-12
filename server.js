// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(cors());
app.use(express.json());

// Block direct access to sensitive files
app.use((req, res, next) => {
    const sensitive = [
        '/data.json',
        '/server.js',
        '/package.json',
        '/package-lock.json',
        '/firebase-blueprint.json',
        '/firestore.rules',
        '/.env',
        '/.env.example'
    ];
    if (sensitive.includes(req.path)) {
        return res.status(403).json({ error: 'Access forbidden' });
    }
    next();
});

// Serve the organized HTML app directory as primary, with root fallback
const HTML_APP_DIR = path.join(__dirname, 'html_attendance_app');
if (fs.existsSync(HTML_APP_DIR)) {
    app.use(express.static(HTML_APP_DIR));
}
app.use(express.static(path.join(__dirname)));


// Endpoint for Firebase client configuration
app.get('/api/config', (req, res) => {
    const configPath = path.join(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return res.json(config);
        } catch (e) {
            console.error('Failed to parse firebase-applet-config.json', e);
        }
    }
    res.status(500).json({ error: 'Firebase configuration not found' });
});

// Helper function to read data from the JSON file
function readData() {
    if (!fs.existsSync(DATA_FILE)) {
        console.log('data.json not found, creating a new file.');
        return { people: [], tasks: [] };
    }
    const rawData = fs.readFileSync(DATA_FILE);
    try {
        const data = JSON.parse(rawData);
        data.people = data.people && Array.isArray(data.people) ? data.people : [];
        data.tasks = data.tasks && Array.isArray(data.tasks) ? data.tasks : [];
        data.events = data.events && Array.isArray(data.events) ? data.events : [];
        return data;
    } catch (e) {
        console.error("Error parsing data.json. Returning an empty structure.");
        return { people: [], tasks: [], events: [] };
    }
}

// Helper function to write data to the JSON file
function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 4));
}

// Initial endpoint to check server status
app.get('/api/status', (req, res) => {
    res.status(200).json({ status: 'online' });
});

// --- PEOPLE Endpoints ---
// Get all people with calculated attendance and task stats
app.get('/api/people', (req, res) => {
    const data = readData();
    const tasks = data.tasks;
    const peopleWithStats = data.people.map(person => {
        const attendance = Array.isArray(person.attendance) ? person.attendance : [];
        const attendedSessions = attendance.filter(s => s.status === true || s.status === 'present').length;
        const excusedSessions = attendance.filter(s => s.excused === true || s.status === 'excused').length;
        const unexcusedSessions = attendance.filter(s => !s.status && !s.excused && s.status !== 'excused' && s.status !== 'present').length;
        const totalSessions = attendance.length;
        
        // Commitment ratio: attended out of required non-excused meetings (User Rule)
        const requiredSessions = totalSessions - excusedSessions;
        const commitmentRatio = requiredSessions > 0 
            ? Math.min(1, attendedSessions / requiredSessions) 
            : (attendedSessions > 0 || excusedSessions > 0 ? 1 : 0);
        const attendanceRatio = totalSessions === 0 ? 0 : attendedSessions / totalSessions;
        
        // Task Stats Calculation
        const personTasks = tasks.filter(t => t.personId === person.id);
        const totalTasks = personTasks.length;
        const completedTasks = personTasks.filter(t => t.status === 'completed').length;
        const taskRatio = totalTasks === 0 ? 0 : completedTasks / totalTasks;

        return {
            ...person,
            attendedSessions,
            excusedSessions,
            unexcusedSessions,
            totalSessions,
            requiredSessions,
            commitmentRatio,
            attendanceRatio,
            totalTasks,
            completedTasks,
            taskRatio
        };
    });
    res.json({ people: peopleWithStats });
});

// Add new person
app.post('/api/people', (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'الاسم مطلوب' });
    }

    const data = readData();
    const existingPerson = data.people.find(p => p.name === name);
    if (existingPerson) {
        return res.status(409).json({ message: 'هذا الشخص مضاف بالفعل' });
    }

    const newPerson = {
        id: uuidv4(),
        name,
        attendance: []
    };
    data.people.push(newPerson);
    writeData(data);
    res.status(201).json({ person: newPerson });
});

// Update person name
app.put('/api/people/:id/name', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'الاسم مطلوب' });
    }

    const data = readData();
    const personIndex = data.people.findIndex(p => p.id === id);

    if (personIndex === -1) {
        return res.status(404).json({ message: 'الشخص غير موجود' });
    }
    
    // Check for duplicate name
    const existingPerson = data.people.find((p, index) => p.name === name && index !== personIndex);
    if (existingPerson) {
        return res.status(409).json({ message: 'الاسم موجود بالفعل لشخص آخر.' });
    }

    data.people[personIndex].name = name;
    writeData(data);
    res.status(200).json({ message: 'تم تحديث الاسم بنجاح', person: data.people[personIndex] });
});

// Delete person
app.delete('/api/people/:id', (req, res) => {
    const { id } = req.params;
    const data = readData();
    
    const initialPeopleCount = data.people.length;
    data.people = data.people.filter(p => p.id !== id);

    if (data.people.length === initialPeopleCount) {
        return res.status(404).json({ message: 'الشخص غير موجود' });
    }
    
    // Remove tasks assigned to the deleted person
    data.tasks = data.tasks.filter(t => t.personId !== id);

    writeData(data);
    res.status(200).json({ message: 'تم حذف الشخص بنجاح' });
});

// --- SESSIONS/DAYS Endpoints ---

// Quick Add Session for all people
app.post('/api/quick-session-all', (req, res) => {
    const { presentIds = [], attendanceMap = {}, date, dayName } = req.body;
    
    if (!date) {
        return res.status(400).json({ message: 'التاريخ مطلوب.' });
    }

    const data = readData();
    
    // Check if a session already exists for this date
    const sessionExists = data.people.some(p => p.attendance.some(s => s.date === date));
    if (sessionExists) {
        return res.status(409).json({ message: 'يوم مسجل بالفعل في هذا التاريخ.' });
    }

    data.people.forEach(person => {
        let isPresent = false;
        let isExcused = false;
        let excuseReason = '';

        if (attendanceMap && attendanceMap[person.id]) {
            const entry = attendanceMap[person.id];
            isPresent = entry.status === 'present' || entry.status === true;
            isExcused = entry.status === 'excused' || entry.excused === true;
            excuseReason = entry.excuseReason || '';
        } else if (Array.isArray(presentIds)) {
            isPresent = presentIds.includes(person.id);
        }

        person.attendance.push({
            date,
            status: isPresent, 
            excused: isExcused,
            excuseReason: excuseReason,
            dayName: dayName || ''
        });
    });

    writeData(data);
    res.status(201).json({ message: 'تم تسجيل الحضور بنجاح ليوم جديد.' });
});

// Get a list of all unique days
app.get('/api/days', (req, res) => {
    const data = readData();
    const daysMap = new Map();

    data.people.forEach(person => {
        person.attendance.forEach(session => {
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

    res.json(days);
});

// Get attendance for a specific day for all people
app.get('/api/days/:date/attendance', (req, res) => {
    const { date } = req.params;
    const data = readData();
    let dayName = '';
    
    const attendanceData = data.people.map(person => {
        const session = person.attendance.find(s => s.date === date);
        if (session && session.dayName) {
            dayName = session.dayName;
        }
        return {
            id: person.id,
            name: person.name,
            status: session ? (session.status === true || session.status === 'present') : false,
            excused: session ? (session.excused === true || session.status === 'excused') : false,
            excuseReason: session ? (session.excuseReason || '') : ''
        };
    });

    res.json({ dayName, attendance: attendanceData.filter(a => a.name) });
});

// Delete a session/day
app.delete('/api/days/:date', (req, res) => {
    const { date } = req.params;
    const data = readData();
    
    let dayFound = false;
    data.people.forEach(person => {
        const initialAttendanceCount = person.attendance.length;
        person.attendance = person.attendance.filter(s => s.date !== date);
        if (person.attendance.length < initialAttendanceCount) {
            dayFound = true;
        }
    });

    if (!dayFound) {
        return res.status(404).json({ message: 'اليوم غير موجود في سجلات الحضور' });
    }

    writeData(data);
    res.status(200).json({ message: 'تم حذف اليوم من سجلات الجميع بنجاح' });
});

// Update day (name and date) AND add additional attendees
app.put('/api/days/:originalDate', (req, res) => {
    const { originalDate } = req.params;
    const { newDate, newDayName, additionalAttendees } = req.body;

    if (!newDate) {
        return res.status(400).json({ message: 'التاريخ الجديد مطلوب.' });
    }

    const data = readData();

    // Check if the new date already exists (and is not the same as the original)
    if (originalDate !== newDate) {
        const dayExists = data.people.some(p => p.attendance.some(s => s.date === newDate));
        if (dayExists) {
            return res.status(409).json({ message: 'التاريخ الجديد موجود بالفعل. يرجى اختيار تاريخ آخر.' });
        }
    }

    let dayFound = false;
    
    // 1. Update existing records (Date and Name)
    data.people.forEach(person => {
        person.attendance.forEach(session => {
            if (session.date === originalDate) {
                session.date = newDate;
                session.dayName = newDayName || '';
                dayFound = true;
            }
        });
    });
    
    // 2. Add Additional Attendees or status updates
    if (req.body.statusUpdates && typeof req.body.statusUpdates === 'object') {
        Object.entries(req.body.statusUpdates).forEach(([personId, update]) => {
            const person = data.people.find(p => p.id === personId);
            if (person) {
                const session = person.attendance.find(s => s.date === newDate);
                const isPresent = update.status === 'present' || update.status === true;
                const isExcused = update.status === 'excused' || update.excused === true;
                const reason = update.excuseReason || '';
                if (session) {
                    session.status = isPresent;
                    session.excused = isExcused;
                    session.excuseReason = reason;
                    session.dayName = newDayName || session.dayName || '';
                } else {
                    person.attendance.push({
                        date: newDate,
                        status: isPresent,
                        excused: isExcused,
                        excuseReason: reason,
                        dayName: newDayName || ''
                    });
                }
                dayFound = true;
            }
        });
    } else if (additionalAttendees && Array.isArray(additionalAttendees) && additionalAttendees.length > 0) {
        additionalAttendees.forEach(personId => {
            const person = data.people.find(p => p.id === personId);
            if (person) {
                const session = person.attendance.find(s => s.date === newDate);
                if (session) {
                    session.status = true; // Mark as present
                    session.excused = false;
                    session.dayName = newDayName || session.dayName || '';
                } else {
                    person.attendance.push({
                        date: newDate,
                        status: true,
                        excused: false,
                        excuseReason: '',
                        dayName: newDayName || ''
                    });
                }
                dayFound = true;
            }
        });
    }

    if (!dayFound) {
        return res.status(404).json({ message: 'اليوم الأصلي غير موجود.' });
    }

    writeData(data);
    res.status(200).json({ message: 'تم تحديث اليوم والحضور بنجاح' });
});

// --- TASKS Endpoints ---

// Get all tasks
app.get('/api/tasks', (req, res) => {
    const data = readData();
    const peopleMap = new Map(data.people.map(p => [p.id, p.name]));

    const tasksWithNames = data.tasks.map(task => ({
        ...task,
        personName: peopleMap.get(task.personId) || 'شخص محذوف 🗑️'
    }));

    res.json(tasksWithNames);
});

// Add new task (Updated to handle multiple people)
app.post('/api/tasks', (req, res) => {
    const { description, personIds, date, status } = req.body;
    
    // Accept array of personIds or single personId (legacy support, though UI sends array now)
    const targets = Array.isArray(personIds) ? personIds : (req.body.personId ? [req.body.personId] : []);

    if (!description || !date) {
        return res.status(400).json({ message: 'الوصف والتاريخ مطلوبان.' });
    }
    
    if (targets.length === 0) {
        return res.status(400).json({ message: 'يجب اختيار شخص واحد على الأقل.' });
    }

    const data = readData();
    
    // Generate a batchId to link these tasks together
    const batchId = uuidv4();

    const newTasks = targets.map(pid => ({
        id: uuidv4(),
        batchId: batchId, // Link them
        description,
        personId: pid,
        date,
        status: status || 'pending'
    }));
    
    data.tasks.push(...newTasks);
    writeData(data);
    res.status(201).json({ message: 'تم إضافة المهام بنجاح', count: newTasks.length });
});

// Update task (Updated to sync status across batch)
app.put('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const { description, personId, date, status } = req.body;
    
    if (!description || !date || !status) {
        return res.status(400).json({ message: 'الوصف والتاريخ والحالة مطلوبان.' });
    }

    const data = readData();
    const taskIndex = data.tasks.findIndex(t => t.id === id);

    if (taskIndex === -1) {
        return res.status(404).json({ message: 'المهمة غير موجودة' });
    }

    const targetTask = data.tasks[taskIndex];
    const batchId = targetTask.batchId;

    // If this task is part of a batch, update ALL tasks in that batch
    if (batchId) {
        let count = 0;
        data.tasks = data.tasks.map(t => {
            if (t.batchId === batchId) {
                count++;
                return {
                    ...t,
                    description, // Update description for all
                    date,        // Update date for all
                    status       // Update status for all
                    // Note: We do NOT update personId for the whole batch, 
                    // as each task in the batch belongs to a different person.
                };
            }
            return t;
        });
        writeData(data);
        return res.status(200).json({ message: `تم تحديث المهمة لـ ${count} اشخاص بنجاح`, task: data.tasks[taskIndex] });
    } else {
        // Legacy or single task update
        data.tasks[taskIndex] = {
            ...data.tasks[taskIndex],
            description,
            personId: personId || targetTask.personId, // Only allow person change for single tasks
            date,
            status
        };
        writeData(data);
        return res.status(200).json({ message: 'تم تحديث المهمة بنجاح', task: data.tasks[taskIndex] });
    }
});

// Delete task (Updated to delete entire batch if applicable)
app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const data = readData();
    
    const taskToDelete = data.tasks.find(t => t.id === id);
    if (!taskToDelete) {
        return res.status(404).json({ message: 'المهمة غير موجودة' });
    }

    const batchId = taskToDelete.batchId;
    const initialTaskCount = data.tasks.length;

    if (batchId) {
        // Delete all tasks in the batch
        data.tasks = data.tasks.filter(t => t.batchId !== batchId);
    } else {
        // Delete single task
        data.tasks = data.tasks.filter(t => t.id !== id);
    }

    if (data.tasks.length === initialTaskCount) {
        return res.status(404).json({ message: 'لم يتم حذف أي مهمة (خطأ غير متوقع)' });
    }

    writeData(data);
    res.status(200).json({ message: 'تم حذف المهمة (والمهام المرتبطة بها) بنجاح' });
});

// --- EVENTS Endpoints ---
app.get('/api/events', (req, res) => {
    const data = readData();
    res.json(data.events || []);
});

app.post('/api/events', (req, res) => {
    const { name, description, startDate, endDate, targetCount } = req.body;
    if (!name || !startDate) {
        return res.status(400).json({ message: 'الاسم وتاريخ البداية مطلوبان' });
    }
    const data = readData();
    const newEvent = {
        id: uuidv4(),
        name,
        description: description || '',
        startDate,
        endDate: endDate || '',
        targetCount: Number(targetCount) || 2,
        sessions: [],
        createdAt: new Date().toISOString()
    };
    data.events = data.events || [];
    data.events.push(newEvent);
    writeData(data);
    res.status(201).json({ event: newEvent });
});

app.put('/api/events/:id', (req, res) => {
    const { id } = req.params;
    const { name, description, startDate, endDate, targetCount, sessions } = req.body;
    const data = readData();
    data.events = data.events || [];
    const idx = data.events.findIndex(e => e.id === id);
    if (idx === -1) {
        return res.status(404).json({ message: 'الحدث غير موجود' });
    }
    data.events[idx] = {
        ...data.events[idx],
        name: name !== undefined ? name : data.events[idx].name,
        description: description !== undefined ? description : data.events[idx].description,
        startDate: startDate !== undefined ? startDate : data.events[idx].startDate,
        endDate: endDate !== undefined ? endDate : data.events[idx].endDate,
        targetCount: targetCount !== undefined ? Number(targetCount) : data.events[idx].targetCount,
        sessions: sessions !== undefined ? sessions : data.events[idx].sessions
    };
    writeData(data);
    res.json({ event: data.events[idx] });
});

app.delete('/api/events/:id', (req, res) => {
    const { id } = req.params;
    const data = readData();
    data.events = data.events || [];
    const initialCount = data.events.length;
    data.events = data.events.filter(e => e.id !== id);
    if (data.events.length === initialCount) {
        return res.status(404).json({ message: 'الحدث غير موجود' });
    }
    writeData(data);
    res.json({ message: 'تم حذف الحدث بنجاح' });
});

// Record attendance for one or more people in an event (auto-calculates nth session and overload)
app.post('/api/events/:id/sessions', (req, res) => {
    const { id } = req.params;
    const { date, personIds, note } = req.body;
    
    if (!date) {
        return res.status(400).json({ message: 'تاريخ النزول مطلوب' });
    }
    const targets = Array.isArray(personIds) ? personIds : (req.body.personId ? [req.body.personId] : []);
    if (targets.length === 0) {
        return res.status(400).json({ message: 'يجب تحديد شخص واحد على الأقل' });
    }

    const data = readData();
    data.events = data.events || [];
    const eventIndex = data.events.findIndex(e => e.id === id);
    if (eventIndex === -1) {
        return res.status(404).json({ message: 'الحدث غير موجود' });
    }

    const event = data.events[eventIndex];
    const target = event.targetCount || 2;
    event.sessions = event.sessions || [];

    const recorded = [];

    targets.forEach(pid => {
        const person = data.people.find(p => p.id === pid);
        if (!person) return;
        person.attendance = person.attendance || [];

        // Count previous attendances in this event
        const previousCount = person.attendance.filter(s => {
            if (!s.status) return false;
            return s.eventId === id || (s.dayName && s.dayName.includes(event.name));
        }).length;

        const currentCount = previousCount + 1;
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
            eventId: id
        };

        person.attendance.push(newSession);
        event.sessions.push({
            date,
            personId: pid,
            sessionNumber: currentCount,
            note: note || ''
        });

        recorded.push({
            personId: pid,
            personName: person.name,
            sessionNumber: currentCount,
            isOverload: currentCount > target,
            overloadCount: Math.max(0, currentCount - target)
        });
    });

    writeData(data);
    res.status(201).json({
        message: `تم تسجيل النزول لـ ${recorded.length} أشخاص بنجاح`,
        recorded,
        event: data.events[eventIndex]
    });
});

// Update full person attendance (for edits or syncs)
app.put('/api/people/:id/attendance', (req, res) => {
    const { id } = req.params;
    const { attendance } = req.body;
    if (!Array.isArray(attendance)) {
        return res.status(400).json({ message: 'سجل الحضور غير صحيح' });
    }
    const data = readData();
    const person = data.people.find(p => p.id === id);
    if (!person) {
        return res.status(404).json({ message: 'الشخص غير موجود' });
    }
    person.attendance = attendance;
    writeData(data);
    res.json({ message: 'تم تحديث سجل الحضور بنجاح', person });
});

// --- SERVER START ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API URL: http://0.0.0.0:${PORT}/api`);
});

module.exports = { readData, writeData, app };