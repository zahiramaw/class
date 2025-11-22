import { db, collection, getDocs, addDoc, query, where, doc, setDoc, deleteDoc } from './firebase-init.js';

// Global callback for Google Auth is handled in index.html shim

// --- DATA STORE (Firebase Adapter) ---
const Store = {
    // Cache to avoid excessive reads
    cache: {
        teachers: null,
        classrooms: null,
        attendance: null
    },

    // Optimized fetch for attendance by date
    async getAttendanceByDate(dateStr) {
        try {
            const q = query(collection(db, 'attendance'), where('date', '==', dateStr));
            const querySnapshot = await getDocs(q);
            const items = [];
            querySnapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });
            return items;
        } catch (e) {
            console.error(`Error getting attendance for ${dateStr}: `, e);
            return [];
        }
    },

    // Optimized fetch for attendance by range (for charts/stats)
    async getAttendanceByRange(startDateStr, endDateStr) {
        try {
            // Note: Firestore range queries on strings work for ISO dates (YYYY-MM-DD)
            const q = query(collection(db, 'attendance'),
                where('date', '>=', startDateStr),
                where('date', '<=', endDateStr)
            );
            const querySnapshot = await getDocs(q);
            const items = [];
            querySnapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });
            return items;
        } catch (e) {
            console.error(`Error getting attendance range: `, e);
            return [];
        }
    },

    async get(collectionName) {
        // For attendance, warn if trying to fetch all
        if (collectionName === 'attendance') {
            console.warn("Performance Warning: Fetching ALL attendance records. Use getAttendanceByDate instead.");
        }

        // For teachers/classrooms, we can cache briefly
        if (collectionName !== 'attendance' && this.cache[collectionName]) {
            return this.cache[collectionName];
        }

        try {
            const querySnapshot = await getDocs(collection(db, collectionName));
            const items = [];
            querySnapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });

            // Update cache
            this.cache[collectionName] = items;
            return items;
        } catch (e) {
            console.error(`Error getting documents from ${collectionName}: `, e);
            return [];
        }
    },

    async add(collectionName, data) {
        try {
            // If data has an ID, use it as document ID, otherwise auto-gen
            let docRef;
            if (data.id && collectionName !== 'attendance') {
                // Use custom ID for teachers/classrooms if provided
                // Note: Firestore document IDs must be strings
                await setDoc(doc(db, collectionName, String(data.id)), data);
                docRef = { id: String(data.id) };
            } else {
                docRef = await addDoc(collection(db, collectionName), data);
            }

            // Invalidate cache
            this.cache[collectionName] = null;
            return docRef.id;
        } catch (e) {
            console.error("Error adding document: ", e);
            throw e;
        }
    },

    async delete(collectionName, id) {
        try {
            await deleteDoc(doc(db, collectionName, String(id)));
            // Invalidate cache
            this.cache[collectionName] = null;
        } catch (e) {
            console.error("Error deleting document: ", e);
            throw e;
        }
    },

    // Helper to seed initial data if empty
    async seedIfEmpty() {
        const teachers = await this.get('teachers');
        if (teachers.length === 0) {
            console.log("Seeding initial data...");
            // Add some default teachers
            const defaultTeachers = [
                { id: 'T001', name: 'John Smith', subject: 'Mathematics' },
                { id: 'T002', name: 'Sarah Johnson', subject: 'Science' }
            ];
            for (const t of defaultTeachers) {
                await this.add('teachers', t);
            }

            // Add some default classrooms
            const defaultClassrooms = [
                { id: 'C001', name: 'Grade 10A', subject: 'General' },
                { id: 'C002', name: 'Grade 10B', subject: 'General' }
            ];
            for (const c of defaultClassrooms) {
                await this.add('classrooms', c);
            }
        }
    }
};

// --- APP LOGIC ---
const app = {
    chart: null,

    getTodayDate() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    async init() {
        // Check if already logged in
        if (sessionStorage.getItem('isLoggedIn')) {
            this.navigateTo('dashboard');
        } else {
            this.navigateTo('login');
        }

        // Initialize dates globally
        const today = this.getTodayDate();
        const statsDate = document.getElementById('stats-date');
        if (statsDate && !statsDate.value) statsDate.value = today;

        const matrixDate = document.getElementById('matrix-date');
        if (matrixDate && !matrixDate.value) matrixDate.value = today;

        // Seed data if needed (background)
        Store.seedIfEmpty();
    },

    navigateTo(viewId) {
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        const viewEl = document.getElementById(`view-${viewId}`);
        if (viewEl) viewEl.classList.remove('hidden');

        if (viewId === 'dashboard') this.renderDashboard();
    },

    // --- AUTH ---
    authorizedEmails: [
        'raashid.mm@gmail.com',
        'raashidmansoor@gmail.com',
        'relaugh@gmail.com',
        'safwanmoha@gmail.com',
    ],

    handleGoogleLogin(response) {
        console.log("Google Auth Response:", response);
        if (response.credential) {
            const payload = JSON.parse(atob(response.credential.split('.')[1]));
            const userEmail = payload.email;
            console.log("Login attempt from:", userEmail);

            // Check if email is authorized
            if (!this.authorizedEmails.includes(userEmail)) {
                alert(`Access Denied!\n\nYour email (${userEmail}) is not authorized to access this system.\n\nPlease contact the administrator.`);
                return;
            }

            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('userEmail', userEmail);
            this.navigateTo('dashboard');
        }
    },

    logout() {
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('userEmail');
        this.navigateTo('login');
    },

    // --- DASHBOARD ---
    switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));

        document.getElementById(`content-${tabId}`).classList.remove('hidden');
        document.getElementById(`tab-${tabId}`).classList.add('active');

        if (tabId === 'overview' || tabId === 'dashboard') this.renderOverview();
        if (tabId === 'class') this.renderMatrix();
        if (tabId === 'teachers') this.renderTeacherStats();
        if (tabId === 'admin') this.renderAdmin();
    },

    async renderTeacherStats() {
        // Initialize date to today if empty
        const dateInput = document.getElementById('stats-date');
        if (!dateInput.value) {
            dateInput.value = this.getTodayDate();
        }
        const selectedDate = dateInput.value;

        const teacherSelect = document.getElementById('stats-teacher-select');

        // Populate select if empty
        if (teacherSelect.options.length === 1) {
            const teachers = await Store.get('teachers');
            teachers.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id; // This is the document ID (or custom ID)
                opt.textContent = t.name;
                teacherSelect.appendChild(opt);
            });
        }

        const selectedTeacherId = teacherSelect.value;

        // Default to monthly summary since filter was removed
        const summaryFilter = 'monthly';

        if (!selectedTeacherId) return;

        // Fetch attendance for the specific date (for daily detail)
        const dailyAttendance = await Store.getAttendanceByDate(selectedDate);

        const tbody = document.querySelector('#stats-daily-table tbody');
        tbody.innerHTML = '';

        const periods = Schedule.getPeriods(new Date(selectedDate)).filter(p => p.type !== 'break');

        periods.forEach(p => {
            const record = dailyAttendance.find(r =>
                r.teacherId === selectedTeacherId &&
                String(r.period) === String(p.id)
            );

            let timeDisplay = '-';
            let lateDisplay = '-';
            let classDisplay = '-';

            if (record) {
                const recordDate = new Date(record.timestamp);
                timeDisplay = recordDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                classDisplay = record.className || '-';

                const statusInfo = Schedule.calculateStatus(p, recordDate);
                const diffMins = statusInfo.delayMins;

                if (diffMins <= 5) {
                    lateDisplay = '<span class="font-bold text-green-600">On time</span>';
                } else if (diffMins <= 15) {
                    lateDisplay = `<span class="font-bold text-yellow-600">${diffMins} minutes</span>`;
                } else {
                    lateDisplay = `<span class="font-bold text-red-600">${diffMins} minutes</span>`;
                }
            }

            tbody.innerHTML += `
                <tr>
                    <td class="font-medium">${p.name}</td>
                    <td>${classDisplay}</td>
                    <td class="font-bold">${timeDisplay}</td>
                    <td>${lateDisplay}</td>
                </tr>
            `;
        });

        // Fetch summary data (weekly or monthly)
        const now = new Date();
        let startDate = new Date();
        if (summaryFilter === 'weekly') {
            startDate.setDate(now.getDate() - 7);
        } else {
            startDate.setDate(1); // Start of month
        }

        const startDateStr = startDate.toLocaleDateString('en-CA');
        const endDateStr = now.toLocaleDateString('en-CA');

        const summaryRecords = await Store.getAttendanceByRange(startDateStr, endDateStr);
        const teacherRecords = summaryRecords.filter(r => r.teacherId === selectedTeacherId);

        let onTimeCount = 0;
        let late10Count = 0;
        let late20Count = 0;

        teacherRecords.forEach(r => {
            const rDate = new Date(r.timestamp);
            const period = Schedule.getPeriods(rDate).find(p => String(p.id) === String(r.period));
            if (period && period.type !== 'break') {
                const statusInfo = Schedule.calculateStatus(period, rDate);
                const diffMins = statusInfo.delayMins;

                if (diffMins <= 5) onTimeCount++;
                else if (diffMins <= 15) late10Count++;
                else late20Count++;
            }
        });

        document.getElementById('summary-on-time').textContent = onTimeCount;
        document.getElementById('summary-late-10').textContent = late10Count;
        document.getElementById('summary-late-20').textContent = late20Count;
    },

    async renderMatrix() {
        const filterGrade = document.getElementById('matrix-grade').value;
        const filterDate = document.getElementById('matrix-date').value || this.getTodayDate();
        document.getElementById('matrix-date').value = filterDate;

        const classrooms = await Store.get('classrooms');
        // Optimized: Fetch ONLY the selected date's attendance
        const attendance = await Store.getAttendanceByDate(filterDate);

        const filteredClasses = classrooms.filter(c => !filterGrade || c.name.includes(`Grade ${filterGrade}`));
        filteredClasses.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

        const tbody = document.querySelector('#matrix-table tbody');
        const thead = document.querySelector('#matrix-table thead tr');

        const periods = Schedule.getPeriods(new Date(filterDate)).filter(p => p.type !== 'break');
        let headerHtml = '<th>Class</th>';
        periods.forEach(p => {
            headerHtml += `<th>P${p.id}</th>`;
        });
        thead.innerHTML = headerHtml;

        tbody.innerHTML = '';

        filteredClasses.forEach(cls => {
            let rowHtml = `<tr><td class="font-bold">${cls.name}</td>`;

            periods.forEach(p => {
                const record = attendance.find(r =>
                    r.className === cls.name &&
                    String(r.period) === String(p.id)
                );

                if (record) {
                    const time = new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const statusColor = record.status === 'Late' ? 'text-red-600' : 'text-green-600';
                    rowHtml += `
                        <td class="text-xs">
                            <div class="font-bold">${record.teacherName}</div>
                            <div class="${statusColor}">${time}</div>
                        </td>
                    `;
                } else {
                    rowHtml += `<td></td>`;
                }
            });

            rowHtml += `</tr>`;
            tbody.innerHTML += rowHtml;
        });
    },

    renderDashboard() {
        this.renderOverview();
        // this.renderAdmin(); // Don't render admin automatically to save reads
    },

    async renderOverview() {
        const teachers = await Store.get('teachers');
        const classrooms = await Store.get('classrooms');
        const today = new Date().toLocaleDateString('en-CA');

        // Optimized: Fetch ONLY today's attendance for stats
        const todayRecords = await Store.getAttendanceByDate(today);

        document.getElementById('stat-on-time').textContent = todayRecords.filter(r => r.status === 'On Time').length;
        document.getElementById('stat-late').textContent = todayRecords.filter(r => r.status === 'Late').length;

        // Calculate absent: Total teachers - Unique teachers who checked in today
        const checkedInTeacherIds = new Set(todayRecords.map(r => r.teacherId));
        document.getElementById('stat-absent').textContent = Math.max(0, teachers.length - checkedInTeacherIds.size);

        // --- UNATTENDED CLASSES LOGIC ---
        const currentPeriod = Schedule.getCurrentPeriod();
        const badge = document.getElementById('current-period-badge');
        const list = document.getElementById('unattended-list');
        list.innerHTML = '';

        if (!currentPeriod || currentPeriod.type === 'break') {
            badge.textContent = currentPeriod ? currentPeriod.name : 'After Hours';
            badge.className = 'px-2 py-1 bg-gray-200 rounded text-xs font-bold text-gray-600';
            list.innerHTML = `<div class="text-gray-500 text-sm col-span-full text-center py-4">
                ${currentPeriod ? 'Currently in Break/Interval' : 'School is closed'}
            </div>`;
        } else {
            badge.textContent = currentPeriod.name;
            badge.className = 'px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-bold';

            // Find classes that have a record for THIS period
            const attendedClassNames = new Set(
                todayRecords
                    .filter(r => String(r.period) === String(currentPeriod.id))
                    .map(r => r.className)
            );

            // Filter classrooms that are NOT in the attended set
            // Sort numerically/alphabetically
            const unattended = classrooms
                .filter(c => !attendedClassNames.has(c.name))
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

            if (unattended.length === 0) {
                list.innerHTML = `<div class="text-green-600 text-sm col-span-full text-center py-4 font-bold">
                    <i class="fas fa-check-circle"></i> All classes attended!
                </div>`;
            } else {
                unattended.forEach(c => {
                    const div = document.createElement('div');
                    div.className = 'p-2 bg-red-50 border border-red-100 rounded text-center text-red-700 font-bold text-sm';
                    div.textContent = c.name;
                    list.appendChild(div);
                });
            }
        }

        // Recent Activity
        const activityList = document.getElementById('recent-activity-list');
        activityList.innerHTML = '';
        const recent = [...todayRecords].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

        if (recent.length === 0) {
            activityList.innerHTML = '<div class="text-gray-400 text-sm text-center">No activity today</div>';
        } else {
            recent.forEach(r => {
                const time = new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                activityList.innerHTML += `
                    <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                            <div class="font-bold text-sm">${r.teacherName}</div>
                            <div class="text-xs text-gray-500">${r.className} • ${r.subject}</div>
                        </div>
                        <div class="text-right">
                            <div class="font-bold text-sm">${time}</div>
                            <div class="text-xs ${r.status === 'Late' ? 'text-red-600' : 'text-green-600'}">${r.status}</div>
                        </div>
                    </div>
                `;
            });
        }
    },

    async renderAdmin() {
        // Teachers Table
        const teachers = await Store.get('teachers');
        const tBody = document.querySelector('#teachers-table tbody');
        tBody.innerHTML = '';
        teachers.forEach(t => {
            tBody.innerHTML += `
                <tr>
                    <td>${t.id}</td>
                    <td>${t.name}</td>
                    <td>${t.subject}</td>
                </tr>
            `;
        });

        // Classrooms Table
        const classrooms = await Store.get('classrooms');
        const cBody = document.querySelector('#classrooms-table tbody');
        cBody.innerHTML = '';
        classrooms.forEach(c => {
            cBody.innerHTML += `
                <tr>
                    <td>${c.name}</td>
                    <td>
                        <button onclick="app.showQR('${c.id}')" class="text-blue-600" title="View QR Code">
                            <i class="fas fa-qrcode"></i>
                        </button>
                        <button onclick="app.downloadQR('${c.id}')" class="text-green-600 ml-2" title="Download QR Code">
                            <i class="fas fa-download"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    },

    // --- ADMIN ACTIONS ---
    openModal(type) {
        document.getElementById('modal-overlay').classList.add('active');
        const form = document.getElementById('modal-fields');
        form.dataset.type = type;
        document.getElementById('modal-title').textContent = type === 'teacher' ? 'Add Teacher' : 'Add Classroom';

        if (type === 'teacher') {
            form.innerHTML = `
                <input type="text" name="id" class="input" placeholder="Teacher ID (e.g. T001)" required>
                <input type="text" name="name" class="input" placeholder="Full Name" required>
                <input type="text" name="subject" class="input" placeholder="Subject" required>
            `;
        } else {
            form.innerHTML = `
                <input type="text" name="id" class="input" placeholder="Class ID (e.g. C001)" required>
                <input type="text" name="name" class="input" placeholder="Class Name (e.g. Grade 10A)" required>
            `;
        }
    },

    closeModal() {
        document.getElementById('modal-overlay').classList.remove('active');
    },

    async handleModalSubmit(e) {
        e.preventDefault();
        const form = document.getElementById('modal-fields');
        const type = form.dataset.type;
        const inputs = form.querySelectorAll('input');
        const data = {};
        inputs.forEach(i => data[i.name] = i.value);

        const collectionName = type === 'teacher' ? 'teachers' : 'classrooms';

        try {
            await Store.add(collectionName, data);
            this.closeModal();
            this.renderAdmin();
        } catch (err) {
            alert("Error saving data: " + err.message);
        }
    },

    async deleteItem(collectionName, id) {
        if (confirm('Are you sure?')) {
            try {
                await Store.delete(collectionName, id);
                this.renderAdmin();
            } catch (err) {
                alert("Error deleting: " + err.message);
            }
        }
    },

    resetSystem() {
        if (confirm('DANGER: This will wipe all local data (not cloud). Continue?')) {
            localStorage.clear();
            location.reload();
        }
    },

    async populateClasses() {
        if (!confirm('This will add classes from Grade 6 to 11 (Sections A-E2). Continue?')) return;

        const grades = [6, 7, 8, 9, 10, 11];
        const sections = ['A', 'B', 'C', 'D', 'E1', 'E2'];
        let count = 0;
        let idCounter = 1;

        try {
            for (const grade of grades) {
                for (const section of sections) {
                    const name = `Grade ${grade}${section}`;
                    const id = `C${String(idCounter++).padStart(3, '0')}`;
                    await Store.add('classrooms', { id, name });
                    count++;
                }
            }
            alert(`Successfully added ${count} classes!`);
            this.renderAdmin();
        } catch (e) {
            console.error(e);
            alert('Error populating classes: ' + e.message);
        }
    },

    async generateSampleData() {
        if (!confirm('This will generate comprehensive sample data (Teachers, Classes, Attendance) for the last 7 days. Continue?')) return;

        try {
            // 1. Create Sample Teachers
            const teachers = [
                { id: 'T_TEST_01', name: 'Test Teacher 1', subject: 'Math' },
                { id: 'T_TEST_02', name: 'Test Teacher 2', subject: 'Science' },
                { id: 'T_TEST_03', name: 'Test Teacher 3', subject: 'English' },
                { id: 'T_TEST_04', name: 'Test Teacher 4', subject: 'History' },
                { id: 'T_TEST_05', name: 'Test Teacher 5', subject: 'Art' }
            ];

            for (const t of teachers) {
                // Use setDoc to ensure we don't create duplicates if run multiple times
                await setDoc(doc(db, 'teachers', t.id), t);
            }

            // 2. Ensure Classrooms exist
            let classrooms = await Store.get('classrooms');
            if (classrooms.length < 5) {
                // If not enough classes, add some test ones
                const testClasses = [
                    { id: 'C_TEST_01', name: 'Grade 10A' },
                    { id: 'C_TEST_02', name: 'Grade 10B' },
                    { id: 'C_TEST_03', name: 'Grade 11A' },
                    { id: 'C_TEST_04', name: 'Grade 9C' }
                ];
                for (const c of testClasses) {
                    await setDoc(doc(db, 'classrooms', c.id), c);
                }
                classrooms = [...classrooms, ...testClasses];
            }

            // 3. Generate Attendance for last 7 days
            const today = new Date();
            // const periods = Schedule.periods.filter(p => p.type !== 'break'); // Moved inside loop

            let recordCount = 0;

            for (let i = 0; i < 7; i++) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateStr = date.toLocaleDateString('en-CA');

                // Skip weekends (0 = Sunday, 6 = Saturday)
                if (date.getDay() === 0 || date.getDay() === 6) continue;

                const periods = Schedule.getPeriods(date).filter(p => p.type !== 'break');

                for (const t of teachers) {
                    for (const p of periods) {
                        // 15% chance of being Absent (no record)
                        if (Math.random() < 0.15) continue;

                        // Randomly assign a classroom
                        const cls = classrooms[Math.floor(Math.random() * classrooms.length)];

                        // Determine Status & Time
                        const rand = Math.random();
                        let delayMinutes = 0;
                        let status = 'On Time';

                        if (rand < 0.7) {
                            // 70% On Time (0-5 mins late)
                            delayMinutes = Math.floor(Math.random() * 5);
                        } else if (rand < 0.9) {
                            // 20% Late (6-15 mins late)
                            delayMinutes = 6 + Math.floor(Math.random() * 10);
                            status = 'Late';
                        } else {
                            // 10% Very Late (16-30 mins late)
                            delayMinutes = 16 + Math.floor(Math.random() * 15);
                            status = 'Late';
                        }

                        // Calculate timestamp
                        const [startH, startM] = p.start.split(':').map(Number);
                        const recordTime = new Date(date);
                        recordTime.setHours(startH, startM + delayMinutes, 0);

                        // Create record
                        const record = {
                            id: Date.now() + Math.random(),
                            teacherId: t.id,
                            teacherName: t.name,
                            className: cls.name,
                            subject: t.subject,
                            period: p.id,
                            timestamp: recordTime.getTime(),
                            date: dateStr,
                            status: status
                        };

                        await Store.add('attendance', record);
                        recordCount++;
                    }
                }
            }

            alert(`Generated ${recordCount} attendance records for the last week!`);
            location.reload();

        } catch (e) {
            console.error(e);
            alert('Error generating data: ' + e.message);
        }
    },

    async showQR(classId) {
        const classrooms = await Store.get('classrooms');
        const cls = classrooms.find(c => c.id === classId);
        if (!cls) return;

        // Create a full-screen A4 poster overlay
        const overlay = document.createElement('div');
        overlay.id = 'qr-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;

        // Close overlay function
        const closeOverlay = () => {
            const overlayEl = document.getElementById('qr-overlay');
            if (overlayEl) {
                overlayEl.remove();
            }
        };

        overlay.innerHTML = `
            <div id="qr-poster-content" style="
                background: white;
                width: 210mm;
                height: 297mm;
                padding: 40px;
                box-shadow: 0 10px 50px rgba(0,0,0,0.5);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                position: relative;
                font-family: 'Inter', sans-serif;
            ">
                <!-- Action Buttons Container -->
                <div style="
                    position: absolute;
                    top: 20px;
                    left: 20px;
                    right: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <!-- Left buttons -->
                    <div style="display: flex; gap: 10px;">
                        <button id="download-qr-btn" style="
                            background: #059669;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 8px;
                            font-size: 14px;
                            cursor: pointer;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            <i class="fas fa-download"></i> Download QR
                        </button>
                        <button onclick="window.print()" style="
                            background: #003366;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 8px;
                            font-size: 14px;
                            cursor: pointer;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                            display: flex;
                            align-items: center;
                            gap: 8px;
                        ">
                            <i class="fas fa-print"></i> Print
                        </button>
                    </div>

                    <!-- Close Button -->
                    <button id="close-qr-btn" style="
                        background: #800000;
                        color: white;
                        border: none;
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        font-size: 20px;
                        cursor: pointer;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">×</button>
                </div>

                <!-- Header -->
                <div style="text-align: center; margin-bottom: 40px;">
                    <h1 style="
                        font-size: 48px;
                        font-weight: 700;
                        color: #800000;
                        margin: 0 0 10px 0;
                    ">ZCM Track</h1>
                    <p style="
                        font-size: 20px;
                        color: #666;
                        margin: 0;
                    ">Teacher Attendance System</p>
                </div>

                <!-- Class Name -->
                <div style="
                    background: linear-gradient(135deg, #800000 0%, #003366 100%);
                    color: white;
                    padding: 30px 60px;
                    border-radius: 16px;
                    margin-bottom: 50px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                ">
                    <h2 style="
                        font-size: 64px;
                        font-weight: 700;
                        margin: 0;
                        text-align: center;
                    ">${cls.name}</h2>
                </div>

                <!-- QR Code Container -->
                <div style="
                    background: white;
                    padding: 30px;
                    border-radius: 20px;
                    box-shadow: 0 8px 30px rgba(0,0,0,0.1);
                    border: 4px solid #800000;
                    margin-bottom: 40px;
                ">
                    <div id="qr-poster-display"></div>
                </div>

                <!-- Instructions -->
                <div style="
                    text-align: center;
                    max-width: 600px;
                ">
                    <h3 style="
                        font-size: 24px;
                        font-weight: 600;
                        color: #333;
                        margin: 0 0 20px 0;
                    ">How to Check In</h3>
                    <ol style="
                        text-align: left;
                        font-size: 18px;
                        color: #666;
                        line-height: 1.8;
                        padding-left: 20px;
                    ">
                        <li>Open the Teacher Check-in page on your mobile device</li>
                        <li>Scan this QR code with your camera</li>
                        <li>Enter your Teacher ID</li>
                        <li>Confirm your attendance</li>
                    </ol>
                </div>

                <!-- Footer -->
                <div style="
                    position: absolute;
                    bottom: 30px;
                    text-align: center;
                    color: #999;
                    font-size: 14px;
                ">
                    Class ID: ${cls.id}
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Generate QR Code with URL
        const teacherPageUrl = `https://zahiramaw.github.io/Track/teacher/?classroom=${cls.id}`;
        new QRCode(overlay.querySelector('#qr-poster-display'), {
            text: teacherPageUrl,
            width: 300,
            height: 300
        });

        // Add event listeners after DOM is ready
        setTimeout(() => {
            // Close button
            const closeBtn = document.getElementById('close-qr-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', closeOverlay);
            }

            // Click outside to close
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeOverlay();
                }
            });

            // ESC key to close
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    closeOverlay();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);

            // Download button
            const downloadBtn = document.getElementById('download-qr-btn');
            if (downloadBtn) {
                downloadBtn.addEventListener('click', () => {
                    // Get the QR code canvas
                    const qrCanvas = overlay.querySelector('#qr-poster-display canvas');
                    if (qrCanvas) {
                        // Create download link
                        const link = document.createElement('a');
                        link.download = `QR_${cls.name.replace(/\s+/g, '_')}_${cls.id}.png`;
                        link.href = qrCanvas.toDataURL('image/png');
                        link.click();
                    }
                });
            }
        }, 100);
    },

    async downloadQR(classId) {
        const classrooms = await Store.get('classrooms');
        const cls = classrooms.find(c => c.id === classId);
        if (!cls) return;

        // Create a temporary hidden container for the poster
        const posterContainer = document.createElement('div');
        posterContainer.style.position = 'fixed';
        posterContainer.style.top = '-9999px'; // off-screen
        posterContainer.style.left = '-9999px';
        posterContainer.style.padding = '20px';
        posterContainer.style.background = 'white';
        posterContainer.style.border = '4px solid #800000';
        posterContainer.style.borderRadius = '12px';
        posterContainer.style.textAlign = 'center';
        posterContainer.id = 'temp-poster-container';
        document.body.appendChild(posterContainer);

        // Title (class name)
        const title = document.createElement('h2');
        title.textContent = cls.name;
        title.style.fontSize = '32px';
        title.style.fontWeight = '700';
        title.style.marginBottom = '20px';
        posterContainer.appendChild(title);

        // QR code container
        const qrDiv = document.createElement('div');
        qrDiv.id = 'qr-poster-display';
        posterContainer.appendChild(qrDiv);

        // Generate QR code (link to teacher page)
        const teacherPageUrl = `https://zahiramaw.github.io/class/teacher/?classroom=${cls.id}`;
        new QRCode(qrDiv, {
            text: teacherPageUrl,
            width: 300,
            height: 300,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // Wait a moment for QR to render, then capture with html2canvas
        setTimeout(() => {
            // @ts-ignore - html2canvas is loaded via CDN
            html2canvas(posterContainer).then(canvas => {
                const link = document.createElement('a');
                link.download = `Poster_${cls.name.replace(/\s+/g, '_')}_${cls.id}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                // Clean up
                posterContainer.remove();
            }).catch(err => {
                console.error('Failed to capture poster:', err);
                posterContainer.remove();
            });
        }, 200);
    },

    async printQRCodes() {
        const classrooms = await Store.get('classrooms');
        const printArea = document.getElementById('print-area');
        printArea.innerHTML = '';
        printArea.classList.remove('hidden');

        classrooms.forEach(cls => {
            const container = document.createElement('div');
            container.className = 'qr-print-item';
            container.innerHTML = `
                <h3>${cls.name}</h3>
                <div class="qr-code"></div>
            `;
            printArea.appendChild(container);

            const teacherPageUrl = `https://zahiramaw.github.io/class/teacher/?classroom=${cls.id}`;
            new QRCode(container.querySelector('.qr-code'), {
                text: teacherPageUrl,
                width: 150,
                height: 150
            });
        });

        setTimeout(() => {
            window.print();
            printArea.classList.add('hidden');
        }, 500);
    }
};

// Expose app globally so HTML onclick handlers work
window.app = app;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
