// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

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
        return data;
    } catch (e) {
        console.error("Error parsing data.json. Returning an empty structure.");
        return { people: [], tasks: [] };
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
        const attendedSessions = person.attendance.filter(s => s.status).length;
        const totalSessions = person.attendance.length;
        const attendanceRatio = totalSessions === 0 ? 0 : attendedSessions / totalSessions;
        
        // Task Stats Calculation - حساب المهام المنجزة فقط
        const personTasks = tasks.filter(t => t.personId === person.id);
        const totalTasks = personTasks.length;
        const completedTasks = personTasks.filter(t => t.status === 'completed').length;
        const taskRatio = totalTasks === 0 ? 0 : completedTasks / totalTasks;

        return {
            ...person,
            attendedSessions,
            totalSessions,
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
    const { presentIds, date, dayName } = req.body;
    
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
        const isPresent = presentIds.includes(person.id);
        person.attendance.push({
            date,
            status: isPresent, 
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
            status: session ? session.status : false
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
    
    // 2. Add Additional Attendees (Set status to true)
    if (additionalAttendees && Array.isArray(additionalAttendees) && additionalAttendees.length > 0) {
        additionalAttendees.forEach(personId => {
            const person = data.people.find(p => p.id === personId);
            if (person) {
                const session = person.attendance.find(s => s.date === newDate);
                if (session) {
                    session.status = true; // Mark as present
                    // Update name just in case
                    session.dayName = newDayName || session.dayName || '';
                } else {
                    // If this person didn't have a record for this day (e.g., new person), add it
                    person.attendance.push({
                        date: newDate,
                        status: true,
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

// --- SERVER START ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`API URL: http://localhost:${PORT}/api`);
});

module.exports = { readData, writeData, app };