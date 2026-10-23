// server.js - Express 5 Backend with Normalized Attendance Architecture & Smart Plan
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const DATA_TEMP_FILE = path.join(__dirname, 'data.json.tmp');

// Security Headers Middleware (Permit AI Studio iFrame preview)
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Block direct access to sensitive files
app.use((req, res, next) => {
    const sensitive = [
        '/data.json',
        '/data.json.tmp',
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

// Health check endpoint
app.get('/api/status', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

// Serve web application static files with optimized caching
app.use(express.static(path.join(__dirname), {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('.json')) {
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// Helper: Rich initial seed data if file is missing or corrupted
function getInitialSeedData() {
    return {
        activePlan: {
            id: 'plan-oct-nov-2026',
            title: 'خطة خدمة وسائل الإيضاح - الربع الرابع 2026',
            startDate: '2026-10-01',
            endDate: '2026-11-30',
            rawWhatsAppText: '✝️ *أسرة الأنبا أرسانيوس والقديس نيقولاوس* ✝️\n📋 *خطة خدمة وسائل الإيضاح - شهري أكتوبر ونوفمبر 2026*\n\nسلام ونعمة يا أحباء المسيح وخدام الوسائل المباركين،\nإليكم جدول لقاءات الخدمة وورش العمل للفترة القادمة:\n\n1️⃣ *الجمعة 10/02:* ورشة افتتاحية - تخطيط وسائل مدارس الأحد وتوزيع الأدوار\n2️⃣ *الجمعة 10/09:* تجهيز مجسمات العهد القديم (خيمة الاجتماع وفلك نوح)\n3️⃣ *الجمعة 10/16:* اللقاء الروحي الشهري + مراجعة تقارير الافتقاد\n4️⃣ *الجمعة 10/23:* تدريب على الوسائل الرقمية والشاشات التفاعلية\n5️⃣ *الجمعة 10/30:* التحضير لمعرض وسائل الإيضاح السنوي والتقييم\n6️⃣ *الجمعة 11/06:* لقاء المتابعة الميدانية وورشة الأعمال الخشبية\n7️⃣ *الجمعة 11/13:* يوم رياضي وروحي مفتوح لشباب وخدام الأسرة\n8️⃣ *الجمعة 11/20:* الاحتفال الختامي وتكريم المنضبطين والمتميزين\n\nصلوا من أجل الخدمة وتذكروا دائماً:\n_\"كُلُّ مَا تَفْعَلُونَهُ، فَافْعَلُوهُ مِنْ كُلِّ الْقَلْبِ، كَمَا لِلرَّبِّ لَيْسَ لِلنَّاسِ\"_',
            scheduledDays: [
                { date: '2026-10-02', dayTitle: 'ورشة افتتاحية وتوزيع الأدوار', details: 'تخطيط وسائل مدارس الأحد', linkedEventId: 'ev-mahrajan' },
                { date: '2026-10-09', dayTitle: 'تجهيز مجسمات العهد القديم', details: 'خيمة الاجتماع وفلك نوح', linkedEventId: 'ev-mahrajan' },
                { date: '2026-10-16', dayTitle: 'اللقاء الروحي الشهري', details: 'مراجعة تقارير الافتقاد', linkedEventId: null },
                { date: '2026-10-23', dayTitle: 'تدريب الوسائل الرقمية', details: 'الشاشات التفاعلية والبرمجيات', linkedEventId: null },
                { date: '2026-10-30', dayTitle: 'التحضير لمعرض الوسائل السنوي', details: 'تنسيق القاعات والعروض', linkedEventId: 'ev-mahrajan' },
                { date: '2026-11-06', dayTitle: 'المتابعة الميدانية وورشة الخشب', details: 'أعمال النجارة والمجسمات', linkedEventId: null },
                { date: '2026-11-13', dayTitle: 'يوم رياضي وروحي مفتوح', details: 'نشاط ترفيهي وبناء الفريق', linkedEventId: null },
                { date: '2026-11-20', dayTitle: 'الاحتفال الختامي وتكريم المنضبطين', details: 'تسليم الجوائز والشهادات', linkedEventId: null }
            ]
        },
        attendanceSessions: {
            '2026-10-02': {
                date: '2026-10-02',
                title: 'ورشة افتتاحية وتوزيع الأدوار',
                dayType: 'meeting_work',
                source: 'plan',
                linkedEventId: 'ev-mahrajan',
                isCompleted: true,
                records: { p1: 'present', p2: 'present', p3: 'present', p4: 'present', p5: 'present', p6: 'absent', p7: 'present', p8: 'present', p9: 'present', p10: 'excused' }
            },
            '2026-10-09': {
                date: '2026-10-09',
                title: 'تجهيز مجسمات العهد القديم',
                dayType: 'work',
                source: 'plan',
                linkedEventId: 'ev-mahrajan',
                isCompleted: true,
                records: { p1: 'present', p2: 'present', p3: 'present', p4: 'present', p5: 'excused', p6: 'absent', p7: 'present', p8: 'present', p9: 'present', p10: 'present' }
            },
            '2026-10-16': {
                date: '2026-10-16',
                title: 'اللقاء الروحي الشهري',
                dayType: 'meeting',
                source: 'plan',
                linkedEventId: null,
                isCompleted: true,
                records: { p1: 'present', p2: 'present', p3: 'late', p4: 'present', p5: 'present', p6: 'absent', p7: 'excused', p8: 'present', p9: 'present', p10: 'present' }
            }
        },
        people: [
            { id: 'p1', name: 'أرساني ملاك', role: 'servant', birthdate: '1994-05-12', notes: 'مسؤول الأسرة وورشة وسائل الإيضاح' },
            { id: 'p2', name: 'نيقولاوس شحاتة', role: 'servant', birthdate: '1996-08-20', notes: 'أمين الصندوق ومتابعة الخامات والماليات' },
            { id: 'p3', name: 'مينا عادل فايز', role: 'servant', birthdate: '1998-11-03', notes: 'مسؤول الوسائط الرقمية والطباعة والتصميم' },
            { id: 'p4', name: 'كيرلس عماد شوقي', role: 'servant', birthdate: '2005-03-14', notes: 'مبدع في أعمال المجسمات والرسم بالألوان' },
            { id: 'p5', name: 'يوسف إبراهيم جورج', role: 'servant', birthdate: '2006-07-22', notes: 'ملتزم جداً، يحتاج تشجيع ومشاركة بالورش' },
            { id: 'p6', name: 'فادي رزق بشاي', role: 'servant', birthdate: '2005-09-18', notes: 'غياب متكرر بسبب ظروف العمل - يحتاج افتقاد فوري' },
            { id: 'p7', name: 'أندرو سمير نظير', role: 'servant', birthdate: '2004-12-05', notes: 'مسؤول الصوتيات والتجهيز الفني بالقاعات' },
            { id: 'p8', name: 'ماركوس وجيه عزمي', role: 'servant', birthdate: '2006-01-30', notes: 'متميز في الابتكار والوسائل التفاعلية' },
            { id: 'p9', name: 'بيشوي رأفت زكي', role: 'servant', birthdate: '2005-04-15', notes: 'التزام كامل 100% في جميع الأنشطة واللقاءات' },
            { id: 'p10', name: 'ديفيد مرقس لبيب', role: 'servant', birthdate: '2007-06-10', notes: 'محب للخدمة ويشارك في مواسم الكنيسة' }
        ],
        tasks: [
            { id: 't1', title: 'تصميم مجسم سفينة نوح بالخشب والألوان', personId: 'p4', personName: 'كيرلس عماد شوقي', status: 'completed', dueDate: '2026-10-15', priority: 'high' },
            { id: 't2', title: 'طباعة بنرات أسبوع الصلاة والافتتاح', personId: 'p3', personName: 'مينا عادل فايز', status: 'completed', dueDate: '2026-10-18', priority: 'medium' },
            { id: 't3', title: 'تجهيز هدايا المتفوقين في المسابقة الكتابية', personId: 'p2', personName: 'نيقولاوس شحاتة', status: 'pending', dueDate: '2026-10-25', priority: 'high' },
            { id: 't4', title: 'متابعة وافتقاد الخدام الغائبين أسبوعين متتاليين', personId: 'p1', personName: 'أرساني ملاك', status: 'pending', dueDate: '2026-10-22', priority: 'high' },
            { id: 't5', title: 'تنسيق معرض وسائل الإيضاح السنوي واللوحات', personId: 'p8', personName: 'ماركوس وجيه عزمي', status: 'completed', dueDate: '2026-10-16', priority: 'medium' }
        ],
        events: [
            { id: 'ev-mahrajan', name: 'مهرجان الكرازة المرقسية - ورشة الوسائل', startDate: '2026-10-01', endDate: '2026-10-31', targetCount: 2, notes: 'مطلوب حضور مرتين لكل خادم - أي نزول إضافي يحسب Overload' },
            { id: 'ev-pascha', name: 'أسبوع الآلام وعيد القيامة 2026', startDate: '2026-04-10', endDate: '2026-04-20', targetCount: 2, notes: 'تنظيم مجسمات القبر المقدس والجلجثة' },
            { id: 'ev-nahda', name: 'نهضة صوم السيدة العذراء مريم', startDate: '2026-08-07', endDate: '2026-08-22', targetCount: 2, notes: 'معرض الصور والأيقونات القبطية والمجسمات' }
        ]
    };
}

// Helper function to read data safely
function readData() {
    if (!fs.existsSync(DATA_FILE)) {
        console.log('data.json not found, initializing with clean empty data.');
        const seed = getInitialSeedData();
        writeData(seed);
        return seed;
    }
    try {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        const data = JSON.parse(rawData);
        data.people = Array.isArray(data.people) ? data.people : [];
        data.tasks = Array.isArray(data.tasks) ? data.tasks : [];
        data.events = Array.isArray(data.events) ? data.events : [];
        data.attendanceSessions = data.attendanceSessions && typeof data.attendanceSessions === 'object' ? data.attendanceSessions : {};
        data.activePlan = data.activePlan && typeof data.activePlan === 'object' ? data.activePlan : null;

        return data;
    } catch (e) {
        console.error('Error parsing data.json, re-seeding safely:', e);
        const seed = getInitialSeedData();
        writeData(seed);
        return seed;
    }
}

// Atomic & queued file write to prevent concurrent file-locking collisions
let writeQueue = Promise.resolve();
function writeData(data) {
    writeQueue = writeQueue.then(() => {
        try {
            const payload = JSON.stringify(data, null, 2);
            fs.writeFileSync(DATA_TEMP_FILE, payload, 'utf8');
            fs.renameSync(DATA_TEMP_FILE, DATA_FILE);
        } catch (err) {
            console.error('Atomic write failed, falling back to direct write:', err);
            fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        }
    }).catch(err => console.error('Write queue error:', err));
    return writeQueue;
}

// Helper: Auto-find matching event for a given date
function findMatchingEventId(dateStr, events) {
    if (!dateStr || !Array.isArray(events)) return null;
    const targetDate = new Date(dateStr).getTime();
    for (const ev of events) {
        if (!ev.startDate) continue;
        const start = new Date(ev.startDate).getTime();
        const end = ev.endDate ? new Date(ev.endDate).getTime() : start;
        if (targetDate >= start && targetDate <= end) {
            return ev.id;
        }
    }
    return null;
}

// Helper: Compute dynamic person attendance stats directly from normalized attendanceSessions
function computePersonStats(person, attendanceSessions, tasks, events) {
    const sessions = Object.values(attendanceSessions);
    const virtualAttendance = [];

    let attendedSessions = 0;
    let excusedSessions = 0;
    let unexcusedSessions = 0;
    let totalSessions = 0;

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

    // Sort virtual attendance by date descending
    virtualAttendance.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Net commitment formula: ((Present + Excused) / Total Sessions)
    const requiredSessions = totalSessions;
    const commitmentRatio = totalSessions === 0 ? 0 : (attendedSessions + excusedSessions) / totalSessions;
    const attendanceRatio = totalSessions === 0 ? 0 : attendedSessions / totalSessions;

    // Task Stats Calculation
    const personTasks = tasks.filter(t => t.personId === person.id);
    const totalTasks = personTasks.length;
    const completedTasks = personTasks.filter(t => t.status === 'completed').length;
    const taskRatio = totalTasks === 0 ? 0 : completedTasks / totalTasks;

    // Overload Calculation across events
    let totalOverload = 0;
    (events || []).forEach(ev => {
        const target = ev.targetCount || 2;
        const count = virtualAttendance.filter(s => s.status && (s.eventId === ev.id || (s.dayName && s.dayName.includes(ev.name)))).length;
        if (count > target) {
            totalOverload += (count - target);
        }
    });

    return {
        ...person,
        role: 'servant',
        birthdate: person.birthdate || '',
        notes: person.notes || '',
        attendance: virtualAttendance, // Virtual synthesized for UI charts and backward compatibility
        attendedSessions,
        excusedSessions,
        unexcusedSessions,
        totalSessions,
        requiredSessions,
        commitmentRatio,
        attendanceRatio,
        totalTasks,
        completedTasks,
        taskRatio,
        totalOverload
    };
}

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

// --- STATUS & HEALTHCHECK ---
app.get('/api/status', (req, res) => {
    const data = readData();
    res.status(200).json({
        status: 'online',
        mode: 'express-5-normalized-dataflow',
        version: '4.0',
        peopleCount: data.people.length,
        tasksCount: data.tasks.length,
        eventsCount: data.events.length,
        planDaysCount: data.activePlan?.scheduledDays?.length || 0,
        sessionsCount: Object.keys(data.attendanceSessions || {}).length,
        timestamp: new Date().toISOString()
    });
});

// --- PLAN & NOTEBOOK LAST PAGE ENDPOINTS ---
// GET /api/plan: Retrieve active plan and notebook last page
app.get('/api/plan', (req, res) => {
    const data = readData();
    res.json({
        activePlan: data.activePlan,
        notebookLastPage: data.activePlan?.notebookLastPage || null
    });
});

// POST & PUT /api/plan: Save/update entire active plan
app.post('/api/plan', (req, res) => {
    savePlanHandler(req, res);
});
app.put('/api/plan', (req, res) => {
    savePlanHandler(req, res);
});

function savePlanHandler(req, res) {
    const { title, rawWhatsAppText, startDate, endDate, notebookLastPage, scheduledDays } = req.body;
    const data = readData();

    // Auto-link matching events for each scheduled day
    const linkedScheduledDays = (scheduledDays || []).map(day => {
        const autoEventId = findMatchingEventId(day.date, data.events);
        return {
            date: day.date,
            dayTitle: day.dayTitle || '',
            details: day.details || '',
            linkedEventId: day.linkedEventId || autoEventId || null
        };
    });

    const updatedPlan = {
        id: data.activePlan?.id || uuidv4(),
        title: title ? title.trim() : (data.activePlan?.title || 'الخطة الأسبوعية لخدمة وسائل الإيضاح'),
        rawWhatsAppText: rawWhatsAppText || data.activePlan?.rawWhatsAppText || '',
        startDate: startDate || data.activePlan?.startDate || '',
        endDate: endDate || data.activePlan?.endDate || '',
        notebookLastPage: notebookLastPage || data.activePlan?.notebookLastPage || {
            title: 'خلاصة آخر صفحة في الكشكول',
            content: '',
            updatedAt: new Date().toISOString()
        },
        scheduledDays: linkedScheduledDays,
        updatedAt: new Date().toISOString()
    };

    data.activePlan = updatedPlan;
    writeData(data);
    res.status(200).json({ message: 'تم حفظ الخطة بنجاح', activePlan: updatedPlan });
}

// PUT /api/plan/notebook: Quick inline update of notebook last page
app.put('/api/plan/notebook', (req, res) => {
    const { title, content } = req.body;
    const data = readData();
    if (!data.activePlan) {
        data.activePlan = getInitialSeedData().activePlan;
    }
    data.activePlan.notebookLastPage = {
        title: title ? title.trim() : (data.activePlan.notebookLastPage?.title || 'خلاصة آخر صفحة في الكشكول'),
        content: content !== undefined ? content : (data.activePlan.notebookLastPage?.content || ''),
        updatedAt: new Date().toISOString()
    };
    writeData(data);
    res.status(200).json({
        message: 'تم تحديث صفحة الكشكول بنجاح',
        notebookLastPage: data.activePlan.notebookLastPage
    });
});

// --- NORMALIZED ATTENDANCE SESSIONS ENDPOINTS ---
// GET /api/attendance-sessions: Get all sessions dictionary
app.get('/api/attendance-sessions', (req, res) => {
    const data = readData();
    res.json({ attendanceSessions: data.attendanceSessions || {} });
});

// POST /api/attendance-session: Unified session recording (from Plan Day, Extra Day, or Event)
app.post('/api/attendance-session', (req, res) => {
    const { date, source, planId, linkedEventId, title, dayType, isCompleted, records } = req.body;
    if (!date) {
        return res.status(400).json({ message: 'تاريخ الجلسة مطلوب' });
    }

    const data = readData();
    data.attendanceSessions = data.attendanceSessions || {};

    // Auto-detect matching event if not explicitly provided
    const detectedEventId = linkedEventId || findMatchingEventId(date, data.events);

    const existingSession = data.attendanceSessions[date] || {};

    data.attendanceSessions[date] = {
        date,
        source: source || existingSession.source || 'plan',
        planId: planId || existingSession.planId || data.activePlan?.id || null,
        linkedEventId: detectedEventId,
        title: title || existingSession.title || `جلسة حضور ${date}`,
        dayType: dayType || existingSession.dayType || 'meeting',
        isCompleted: isCompleted !== undefined ? Boolean(isCompleted) : true,
        records: records && typeof records === 'object' ? records : (existingSession.records || {})
    };

    // Bidirectional Event sync: If linked to event, update event session count if applicable
    if (detectedEventId && data.events) {
        const ev = data.events.find(e => e.id === detectedEventId);
        if (ev) {
            ev.lastSessionDate = date;
        }
    }

    writeData(data);
    res.status(200).json({
        message: 'تم تسجيل جلسة الحضور بنجاح',
        session: data.attendanceSessions[date]
    });
});

// DELETE /api/attendance-session/:date: Delete an attendance session
app.delete('/api/attendance-session/:date', (req, res) => {
    const { date } = req.params;
    const data = readData();
    if (!data.attendanceSessions || !data.attendanceSessions[date]) {
        return res.status(404).json({ message: 'الجلسة غير موجودة' });
    }
    delete data.attendanceSessions[date];
    writeData(data);
    res.status(200).json({ message: 'تم حذف جلسة الحضور بنجاح', date });
});

// --- PEOPLE ENDPOINTS (Dynamic Stats from normalized attendanceSessions) ---
app.get('/api/people', (req, res) => {
    const data = readData();
    const tasks = data.tasks || [];
    const events = data.events || [];
    const attendanceSessions = data.attendanceSessions || {};

    const peopleWithStats = data.people.map(person => 
        computePersonStats(person, attendanceSessions, tasks, events)
    );
    res.json({ people: peopleWithStats });
});

app.post('/api/people', (req, res) => {
    const { name, role, birthdate, notes } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'الاسم مطلوب' });
    }

    const trimmedName = name.trim();
    const data = readData();
    const existingPerson = data.people.find(p => p.name.trim().toLowerCase() === trimmedName.toLowerCase());
    if (existingPerson) {
        return res.status(409).json({ message: 'هذا الشخص مضاف بالفعل' });
    }

    const newPerson = {
        id: uuidv4(),
        name: trimmedName,
        role: 'servant',
        birthdate: birthdate ? String(birthdate).trim() : '',
        notes: notes ? String(notes).trim() : ''
    };
    data.people.push(newPerson);
    writeData(data);

    const personWithStats = computePersonStats(newPerson, data.attendanceSessions || {}, data.tasks || [], data.events || []);
    res.status(201).json({ person: personWithStats, message: 'تم إضافة الخادم بنجاح' });
});

app.put('/api/people/:id', (req, res) => {
    const { id } = req.params;
    const { name, role, birthdate, notes } = req.body;

    const data = readData();
    const index = data.people.findIndex(p => p.id === id);
    if (index === -1) {
        return res.status(404).json({ message: 'الشخص غير موجود' });
    }

    if (name) {
        const trimmed = name.trim();
        const duplicate = data.people.find((p, i) => i !== index && p.name.trim().toLowerCase() === trimmed.toLowerCase());
        if (duplicate) {
            return res.status(409).json({ message: 'الاسم موجود بالفعل لشخص آخر' });
        }
        data.people[index].name = trimmed;
    }

    data.people[index].role = 'servant';
    if (birthdate !== undefined) data.people[index].birthdate = String(birthdate).trim();
    if (notes !== undefined) data.people[index].notes = String(notes).trim();

    writeData(data);
    const updatedWithStats = computePersonStats(data.people[index], data.attendanceSessions || {}, data.tasks || [], data.events || []);
    res.status(200).json({ message: 'تم تحديث بيانات الشخص بنجاح', person: updatedWithStats });
});

app.put('/api/people/:id/name', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ message: 'الاسم مطلوب' });
    }

    const data = readData();
    const personIndex = data.people.findIndex(p => p.id === id);
    if (personIndex === -1) {
        return res.status(404).json({ message: 'الشخص غير موجود' });
    }
    
    const trimmed = name.trim();
    const existingPerson = data.people.find((p, index) => p.name.trim().toLowerCase() === trimmed.toLowerCase() && index !== personIndex);
    if (existingPerson) {
        return res.status(409).json({ message: 'الاسم موجود بالفعل لشخص آخر.' });
    }

    data.people[personIndex].name = trimmed;
    writeData(data);
    res.status(200).json({ message: 'تم تحديث الاسم بنجاح', person: data.people[personIndex] });
});

app.delete('/api/people/:id', (req, res) => {
    const { id } = req.params;
    const data = readData();
    
    const initialPeopleCount = data.people.length;
    data.people = data.people.filter(p => p.id !== id);

    if (data.people.length === initialPeopleCount) {
        return res.status(404).json({ message: 'الشخص غير موجود' });
    }
    
    // Remove tasks assigned to the deleted person
    data.tasks = (data.tasks || []).filter(t => t.personId !== id);

    // Remove from attendanceSessions records
    if (data.attendanceSessions) {
        Object.values(data.attendanceSessions).forEach(session => {
            if (session.records && session.records[id]) {
                delete session.records[id];
            }
        });
    }

    writeData(data);
    res.status(200).json({ message: 'تم حذف الشخص بنجاح' });
});

// Backward compatible endpoints
app.get('/api/days', (req, res) => {
    const data = readData();
    const sessions = Object.values(data.attendanceSessions || {});
    const days = sessions.map(s => ({
        date: s.date,
        dayName: s.title || ''
    }));
    days.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(days);
});

app.get('/api/days/:date/attendance', (req, res) => {
    const { date } = req.params;
    const data = readData();
    const session = (data.attendanceSessions || {})[date];
    const dayName = session ? session.title : '';
    
    const attendanceData = data.people.map(person => {
        const status = session?.records ? session.records[person.id] : undefined;
        return {
            id: person.id,
            name: person.name,
            role: person.role || 'member',
            phone: person.phone || '',
            status: status === 'present' || status === 'late',
            excused: status === 'excused',
            isLate: status === 'late',
            excuseReason: ''
        };
    });

    res.json({ dayName, attendance: attendanceData });
});

// --- TASKS ENDPOINTS ---
app.get('/api/tasks', (req, res) => {
    const data = readData();
    const peopleMap = new Map(data.people.map(p => [p.id, p.name]));

    const tasksWithNames = (data.tasks || []).map(task => ({
        ...task,
        priority: task.priority || 'normal',
        status: task.status || 'pending',
        personName: peopleMap.get(task.personId) || 'شخص محذوف 🗑️'
    }));

    res.json(tasksWithNames);
});

app.post('/api/tasks', (req, res) => {
    const { description, personIds, date, status, priority } = req.body;
    const targets = Array.isArray(personIds) ? personIds : (req.body.personId ? [req.body.personId] : []);

    if (!description || !date) {
        return res.status(400).json({ message: 'الوصف والتاريخ مطلوبان.' });
    }
    
    if (targets.length === 0) {
        return res.status(400).json({ message: 'يجب اختيار شخص واحد على الأقل.' });
    }

    const data = readData();
    const batchId = uuidv4();

    const newTasks = targets.map(pid => ({
        id: uuidv4(),
        batchId: batchId,
        description: description.trim(),
        personId: pid,
        date,
        priority: priority || 'normal',
        status: status || 'pending',
        createdAt: new Date().toISOString()
    }));
    
    data.tasks = data.tasks || [];
    data.tasks.push(...newTasks);
    writeData(data);
    res.status(201).json({ message: 'تم إضافة المهام بنجاح', count: newTasks.length, tasks: newTasks });
});

app.put('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const { description, personId, date, status, priority } = req.body;
    
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

    if (batchId) {
        let count = 0;
        data.tasks = data.tasks.map(t => {
            if (t.batchId === batchId) {
                count++;
                return {
                    ...t,
                    description: description.trim(),
                    date,
                    status,
                    priority: priority !== undefined ? priority : (t.priority || 'normal')
                };
            }
            return t;
        });
        writeData(data);
        return res.status(200).json({ message: `تم تحديث المهمة لـ ${count} أشخاص بنجاح`, task: data.tasks[taskIndex] });
    } else {
        data.tasks[taskIndex] = {
            ...data.tasks[taskIndex],
            description: description.trim(),
            personId: personId || targetTask.personId,
            date,
            status,
            priority: priority !== undefined ? priority : (targetTask.priority || 'normal')
        };
        writeData(data);
        return res.status(200).json({ message: 'تم تحديث المهمة بنجاح', task: data.tasks[taskIndex] });
    }
});

app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const data = readData();
    
    const taskToDelete = (data.tasks || []).find(t => t.id === id);
    if (!taskToDelete) {
        return res.status(404).json({ message: 'المهمة غير موجودة' });
    }

    const batchId = taskToDelete.batchId;
    const initialTaskCount = data.tasks.length;

    if (batchId) {
        data.tasks = data.tasks.filter(t => t.batchId !== batchId);
    } else {
        data.tasks = data.tasks.filter(t => t.id !== id);
    }

    if (data.tasks.length === initialTaskCount) {
        return res.status(404).json({ message: 'لم يتم حذف أي مهمة' });
    }

    writeData(data);
    res.status(200).json({ message: 'تم حذف المهمة (والمهام المرتبطة بها) بنجاح' });
});

// --- EVENTS ENDPOINTS ---
app.get('/api/events', (req, res) => {
    const data = readData();
    const events = data.events || [];
    const sessions = Object.values(data.attendanceSessions || {});

    // Compute dynamic live attendance stats for each event directly from attendanceSessions
    const eventsWithLiveStats = events.map(ev => {
        const target = ev.targetCount || 2;
        const matchingSessions = sessions.filter(s => s.linkedEventId === ev.id || (s.title && s.title.includes(ev.name)));

        // Count attendances per person for this event
        const personAttendanceMap = {};
        matchingSessions.forEach(session => {
            if (!session.records) return;
            Object.entries(session.records).forEach(([personId, status]) => {
                if (status === 'present' || status === 'late') {
                    personAttendanceMap[personId] = (personAttendanceMap[personId] || 0) + 1;
                }
            });
        });

        const attendeesCount = Object.keys(personAttendanceMap).length;
        const completedTargetCount = Object.values(personAttendanceMap).filter(c => c >= target).length;
        const totalOverloadCount = Object.values(personAttendanceMap).reduce((sum, c) => sum + Math.max(0, c - target), 0);
        const totalSessionsCount = matchingSessions.length;

        return {
            ...ev,
            attendeesCount,
            completedTargetCount,
            totalOverloadCount,
            totalSessionsCount,
            matchingSessionDates: matchingSessions.map(s => s.date)
        };
    });

    res.json(eventsWithLiveStats);
});

app.post('/api/events', (req, res) => {
    const { name, description, startDate, endDate, targetCount } = req.body;
    if (!name || !startDate) {
        return res.status(400).json({ message: 'الاسم وتاريخ البداية مطلوبان' });
    }
    const data = readData();
    const newEvent = {
        id: uuidv4(),
        name: name.trim(),
        description: description ? description.trim() : '',
        startDate,
        endDate: endDate || '',
        targetCount: Number(targetCount) || 2,
        createdAt: new Date().toISOString()
    };
    data.events = data.events || [];
    data.events.push(newEvent);

    // Auto-link existing sessions or plan days that fall in this range
    if (data.attendanceSessions) {
        Object.values(data.attendanceSessions).forEach(session => {
            if (!session.linkedEventId && findMatchingEventId(session.date, [newEvent])) {
                session.linkedEventId = newEvent.id;
            }
        });
    }

    writeData(data);
    res.status(201).json({ event: newEvent, message: 'تم إضافة الحدث بنجاح' });
});

app.put('/api/events/:id', (req, res) => {
    const { id } = req.params;
    const { name, description, startDate, endDate, targetCount } = req.body;
    const data = readData();
    data.events = data.events || [];
    const idx = data.events.findIndex(e => e.id === id);
    if (idx === -1) {
        return res.status(404).json({ message: 'الحدث غير موجود' });
    }
    data.events[idx] = {
        ...data.events[idx],
        name: name !== undefined ? name.trim() : data.events[idx].name,
        description: description !== undefined ? description.trim() : data.events[idx].description,
        startDate: startDate !== undefined ? startDate : data.events[idx].startDate,
        endDate: endDate !== undefined ? endDate : data.events[idx].endDate,
        targetCount: targetCount !== undefined ? Number(targetCount) : data.events[idx].targetCount
    };
    writeData(data);
    res.json({ event: data.events[idx], message: 'تم تحديث الحدث بنجاح' });
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

// --- EXPORT & IMPORT BACKUP ENDPOINTS ---
app.get('/api/export', (req, res) => {
    const data = readData();
    const format = (req.query.format || 'json').toLowerCase();

    if (format === 'csv') {
        let csv = '\uFEFF';
        csv += 'الاسم,الدور,تاريخ الميلاد,ملاحظات,نسبة الالتزام بالعذر,مرات الحضور,الغياب بعذر,الغياب بدون عذر,المهام المنجزة,إجمالي المهام\n';
        const peopleWithStats = data.people.map(p => computePersonStats(p, data.attendanceSessions || {}, data.tasks || [], data.events || []));

        peopleWithStats.forEach(p => {
            const escapeCsv = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
            const roleArabic = 'خادم';
            const commitment = `${(p.commitmentRatio * 100).toFixed(0)}%`;

            csv += [
                escapeCsv(p.name),
                escapeCsv(roleArabic),
                escapeCsv(p.birthdate || ''),
                escapeCsv(p.notes || ''),
                escapeCsv(commitment),
                p.attendedSessions,
                p.excusedSessions,
                p.unexcusedSessions,
                p.completedTasks,
                p.totalTasks
            ].join(',') + '\n';
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="family-system-export-${new Date().toISOString().slice(0, 10)}.csv"`);
        return res.send(csv);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="family-system-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json({
        system: 'أسرة الأنبا أرسانيوس والقديس نيقولاوس - خدمة وسائل الإيضاح',
        version: '4.0',
        exportedAt: new Date().toISOString(),
        data
    });
});

app.post('/api/import', (req, res) => {
    try {
        const payload = req.body.data || req.body;
        if (!payload || typeof payload !== 'object') {
            return res.status(400).json({ message: 'صيغة النسخة الاحتياطية غير صالحة' });
        }

        if (!Array.isArray(payload.people)) {
            return res.status(400).json({ message: 'حقل الأشخاص (people) غير متوفر في النسخة' });
        }

        const cleanData = {
            activePlan: payload.activePlan || null,
            attendanceSessions: payload.attendanceSessions && typeof payload.attendanceSessions === 'object' ? payload.attendanceSessions : {},
            people: payload.people.map(p => ({
                id: p.id || uuidv4(),
                name: String(p.name || '').trim(),
                role: 'servant',
                birthdate: String(p.birthdate || '').trim(),
                notes: String(p.notes || '').trim()
            })).filter(p => p.name),
            tasks: Array.isArray(payload.tasks) ? payload.tasks : [],
            events: Array.isArray(payload.events) ? payload.events : []
        };

        writeData(cleanData);
        res.status(200).json({
            message: 'تم استعادة النسخة الاحتياطية بنجاح',
            restoredPeople: cleanData.people.length,
            restoredTasks: cleanData.tasks.length,
            restoredEvents: cleanData.events.length,
            restoredSessions: Object.keys(cleanData.attendanceSessions).length
        });
    } catch (err) {
        console.error('Import error:', err);
        res.status(500).json({ message: 'حدث خطأ أثناء معالجة ملف النسخة الاحتياطية', error: err.message });
    }
});

// --- SERVER START ---
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Church Service Monitoring System running on port ${PORT}`);
    console.log(`Live Preview ready at: http://0.0.0.0:${PORT}`);
});

module.exports = { readData, writeData, app };