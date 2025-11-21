// Global callback for Google Auth
function handleGoogleLogin(response) {
    app.handleGoogleLogin(response);
}

// --- DATA STORE ---
const Store = {
    get: (key, defaultVal) => JSON.parse(localStorage.getItem(key)) || defaultVal,
    set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),

    init() {
        if (!localStorage.getItem('teachers')) {
            this.set('teachers', [
                { id: 'T001', name: 'John Smith', subject: 'Mathematics' },
                { id: 'T002', name: 'Sarah Johnson', subject: 'Science' },
                { id: 'T003', name: 'Emily Davis', subject: 'English' },
                { id: 'T004', name: 'Michael Brown', subject: 'History' },
                { id: 'T005', name: 'Jessica Wilson', subject: 'Art' }
            ]);
        }
        if (!localStorage.getItem('classrooms')) {
            const grades = [6, 7, 8, 9, 10, 11];
            const sections = ['A', 'B', 'C', 'D', 'E1', 'E2'];
            const classrooms = [];
            let idCounter = 1;

            grades.forEach(grade => {
                sections.forEach(section => {
                    classrooms.push({
                        id: `C${String(idCounter++).padStart(3, '0')}`,
                        name: `Grade ${grade}${section}`,
                        subject: 'General'
                    });
                });
            });
            this.set('classrooms', classrooms);
        }
        if (!localStorage.getItem('attendance')) {
            const today = new Date().toISOString().split('T')[0];
            this.set('attendance', [
                {
                    id: Date.now(),
                    teacherId: 'T001',
                    teacherName: 'John Smith',
                    className: 'Grade 9A',
                    subject: 'Mathematics',
                    timestamp: new Date(today + 'T08:55:00').getTime(),
                    date: today,
                    status: 'On Time'
                }
            ]);
        }
    }
};

// --- APP LOGIC ---
const app = {
    chart: null,

    init() {
        Store.init();

        // Check if already logged in
        if (sessionStorage.getItem('isLoggedIn')) {
            this.navigateTo('dashboard');
        } else {
            this.navigateTo('login');
        }
    },

    navigateTo(viewId) {
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-${viewId}`).classList.remove('hidden');

        if (viewId === 'dashboard') this.renderDashboard();
    },

    // --- AUTH ---
    // Authorized email addresses (add your authorized emails here)
    authorizedEmails: [
        'raashid.mm@gmail.com',
        'raashidmansoor@gmail.com',  // Add your authorized emails here
        // 'another.email@gmail.com',
        // 'admin@example.com'
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

        if (tabId === 'overview') this.renderOverview();
        if (tabId === 'matrix') this.renderMatrix();
        if (tabId === 'teacher-stats') this.renderTeacherStats();
        if (tabId === 'admin') this.renderAdmin();
    },

    renderTeacherStats() {
        const teacherSelect = document.getElementById('stats-teacher-select');
        if (teacherSelect.options.length === 1) {
            const teachers = Store.get('teachers', []);
            teachers.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = t.name;
                teacherSelect.appendChild(opt);
            });
        }

        const selectedTeacherId = teacherSelect.value;
        const dateInput = document.getElementById('stats-date');
        if (!dateInput.value) dateInput.value = new Date().toISOString().split('T')[0];
        const selectedDate = dateInput.value;
        const summaryFilter = document.getElementById('stats-period-filter').value;

        if (!selectedTeacherId) return;

        const attendance = Store.get('attendance', []);
        const tbody = document.querySelector('#stats-daily-table tbody');
        tbody.innerHTML = '';

        const periods = Schedule.periods.filter(p => p.type !== 'break');

        periods.forEach(p => {
            const record = attendance.find(r =>
                r.teacherId === selectedTeacherId &&
                r.date === selectedDate &&
                String(r.period) === String(p.id)
            );

            let timeDisplay = '-';
            let lateDisplay = '-';

            if (record) {
                const recordDate = new Date(record.timestamp);
                timeDisplay = recordDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
                    <td class="font-bold">${timeDisplay}</td>
                    <td>${lateDisplay}</td>
                </tr>
            `;
        });

        const now = new Date();
        let startDate = new Date();
        if (summaryFilter === 'weekly') {
            startDate.setDate(now.getDate() - 7);
        } else {
            startDate.setDate(1);
        }

        const summaryRecords = attendance.filter(r =>
            r.teacherId === selectedTeacherId &&
            new Date(r.date) >= startDate
        );

        let onTimeCount = 0;
        let late10Count = 0;
        let late20Count = 0;

        summaryRecords.forEach(r => {
            const period = Schedule.periods.find(p => String(p.id) === String(r.period));
            if (period && period.type !== 'break') {
                const rDate = new Date(r.timestamp);
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

    renderMatrix() {
        const filterGrade = document.getElementById('matrix-grade').value;
        const filterDate = document.getElementById('matrix-date').value || new Date().toISOString().split('T')[0];
        document.getElementById('matrix-date').value = filterDate;

        const classrooms = Store.get('classrooms', []);
        const attendance = Store.get('attendance', []);

        const filteredClasses = classrooms.filter(c => !filterGrade || c.name.includes(`Grade ${filterGrade}`));
        filteredClasses.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

        const tbody = document.querySelector('#matrix-table tbody');
        const thead = document.querySelector('#matrix-table thead tr');

        const periods = Schedule.periods.filter(p => p.type !== 'break');
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
                    r.date === filterDate &&
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
        this.renderAdmin();
    },

    renderOverview() {
        const teachers = Store.get('teachers', []);
        const attendance = Store.get('attendance', []);
        const today = new Date().toISOString().split('T')[0];

        const todayRecords = attendance.filter(r => r.date === today);

        document.getElementById('stat-on-time').textContent = todayRecords.filter(r => r.status === 'On Time').length;
        document.getElementById('stat-late').textContent = todayRecords.filter(r => r.status === 'Late').length;
        document.getElementById('stat-absent').textContent = teachers.length - new Set(todayRecords.map(r => r.teacherId)).size;

        // Chart
        const ctx = document.getElementById('chart-attendance').getContext('2d');
        if (this.chart) this.chart.destroy();

        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const data = last7Days.map(date => attendance.filter(r => r.date === date).length);

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'Check-ins',
                    data: data,
                    borderColor: '#800000',
                    tension: 0.4
                }]
            },
            options: { responsive: true }
        });

        // Recent Activity
        const list = document.getElementById('recent-activity-list');
        list.innerHTML = '';
        const recent = [...attendance].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

        recent.forEach(r => {
            const time = new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            list.innerHTML += `
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
    },

    renderAdmin() {
        // Teachers Table
        const teachers = Store.get('teachers', []);
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
        const classrooms = Store.get('classrooms', []);
        const cBody = document.querySelector('#classrooms-table tbody');
        cBody.innerHTML = '';
        classrooms.forEach(c => {
            cBody.innerHTML += `
                <tr>
                    <td>${c.name}</td>
                    <td><button onclick="app.showQR('${c.id}')" class="text-blue-600"><i class="fas fa-qrcode"></i></button></td>
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
                <input type="text" name="subject" class="input" placeholder="Subject (e.g. Mathematics)" required>
            `;
        }
    },

    closeModal() {
        document.getElementById('modal-overlay').classList.remove('active');
    },

    handleModalSubmit(e) {
        e.preventDefault();
        const form = document.getElementById('modal-fields');
        const type = form.dataset.type;
        const inputs = form.querySelectorAll('input');
        const data = {};
        inputs.forEach(i => data[i.name] = i.value);

        const key = type === 'teacher' ? 'teachers' : 'classrooms';
        const items = Store.get(key, []);
        items.push(data);
        Store.set(key, items);

        this.closeModal();
        this.renderAdmin();
    },

    deleteItem(key, id) {
        if (confirm('Are you sure?')) {
            const items = Store.get(key, []);
            const newItems = items.filter(i => i.id !== id);
            Store.set(key, newItems);
            this.renderAdmin();
        }
    },

    resetSystem() {
        if (confirm('DANGER: This will wipe all data. Continue?')) {
            localStorage.clear();
            location.reload();
        }
    },

    showQR(classId) {
        const classrooms = Store.get('classrooms', []);
        const cls = classrooms.find(c => c.id === classId);
        if (!cls) return;

        // Create a full-screen A4 poster overlay
        const overlay = document.createElement('div');
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

        overlay.innerHTML = `
            <div style="
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
                <!-- Close Button -->
                <button onclick="this.closest('div[style*=fixed]').remove()" style="
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: #800000;
                    color: white;
                    border: none;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    font-size: 20px;
                    cursor: pointer;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                ">×</button>

                <!-- Print Button -->
                <button onclick="window.print()" style="
                    position: absolute;
                    top: 20px;
                    left: 20px;
                    background: #003366;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    cursor: pointer;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                ">
                    <i class="fas fa-print"></i> Print
                </button>

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

        // Generate QR Code
        new QRCode(overlay.querySelector('#qr-poster-display'), {
            text: JSON.stringify({ id: cls.id, name: cls.name }),
            width: 300,
            height: 300
        });
    },

    printQRCodes() {
        const classrooms = Store.get('classrooms', []);
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

            new QRCode(container.querySelector('.qr-code'), {
                text: JSON.stringify({ id: cls.id, name: cls.name }),
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
