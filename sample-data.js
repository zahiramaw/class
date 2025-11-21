/**
 * SAMPLE DATA FOR TESTING
 * This file contains comprehensive test data for the ZCM Track system.
 * To remove all sample data, simply delete or comment out the loadSampleData() call in admin.js
 */

const SampleData = {
    /**
     * Load all sample data into localStorage
     * This will populate the system with realistic test data for dates: Nov 22, 21, 20, 2024
     */
    loadSampleData() {
        // Teachers
        const teachers = [
            { id: 'T001', name: 'John Smith', subject: 'Mathematics' },
            { id: 'T002', name: 'Sarah Johnson', subject: 'Science' },
            { id: 'T003', name: 'Emily Davis', subject: 'English' },
            { id: 'T004', name: 'Michael Brown', subject: 'History' },
            { id: 'T005', name: 'Jessica Wilson', subject: 'Art' },
            { id: 'T006', name: 'David Martinez', subject: 'Physical Education' },
            { id: 'T007', name: 'Lisa Anderson', subject: 'Music' },
            { id: 'T008', name: 'Robert Taylor', subject: 'Computer Science' },
            { id: 'T009', name: 'Amanda White', subject: 'Geography' },
            { id: 'T010', name: 'James Lee', subject: 'Chemistry' }
        ];

        // Classrooms (Grades 6-11, Sections A-E2)
        const classrooms = [];
        const grades = [6, 7, 8, 9, 10, 11];
        const sections = ['A', 'B', 'C', 'D', 'E1', 'E2'];
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

        // Generate comprehensive attendance data for 3 days (today, yesterday, day before)
        const attendance = [];
        const today = new Date();
        const dates = [
            today.toISOString().split('T')[0],  // Today
            new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],  // Yesterday
            new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]  // 2 days ago
        ];

        // Period times from schedule.js
        const periods = [
            { id: 1, start: '08:00', end: '08:45' },
            { id: 2, start: '08:50', end: '09:35' },
            { id: 3, start: '09:40', end: '10:25' },
            { id: 4, start: '11:00', end: '11:45' },
            { id: 5, start: '11:50', end: '12:35' },
            { id: 6, start: '13:15', end: '14:00' },
            { id: 7, start: '14:05', end: '14:50' }
        ];

        let attendanceId = 1000;

        dates.forEach((date, dateIndex) => {
            // For each date, create attendance records
            classrooms.forEach((classroom, classIndex) => {
                periods.forEach((period) => {
                    // Randomly assign a teacher (simulate realistic scheduling)
                    const teacher = teachers[Math.floor(Math.random() * teachers.length)];

                    // Determine attendance status with realistic distribution
                    const rand = Math.random();
                    let status, delayMinutes;

                    if (rand < 0.70) {
                        // 70% on time (0-5 minutes early/late)
                        status = 'On Time';
                        delayMinutes = Math.floor(Math.random() * 6) - 2; // -2 to +3 minutes
                    } else if (rand < 0.85) {
                        // 15% slightly late (6-15 minutes)
                        status = 'Late';
                        delayMinutes = 6 + Math.floor(Math.random() * 10);
                    } else if (rand < 0.95) {
                        // 10% very late (16-30 minutes)
                        status = 'Late';
                        delayMinutes = 16 + Math.floor(Math.random() * 15);
                    } else {
                        // 5% absent (no record created)
                        return; // Skip this record
                    }

                    // Calculate timestamp
                    const [startHour, startMinute] = period.start.split(':').map(Number);
                    const timestamp = new Date(`${date}T${String(startHour).padStart(2, '0')}:${String(startMinute + delayMinutes).padStart(2, '0')}:00`).getTime();

                    attendance.push({
                        id: attendanceId++,
                        teacherId: teacher.id,
                        teacherName: teacher.name,
                        className: classroom.name,
                        subject: teacher.subject,
                        period: period.id,
                        timestamp: timestamp,
                        date: date,
                        status: status
                    });
                });
            });
        });

        // Save to localStorage
        localStorage.setItem('teachers', JSON.stringify(teachers));
        localStorage.setItem('classrooms', JSON.stringify(classrooms));
        localStorage.setItem('attendance', JSON.stringify(attendance));

        console.log('✅ Sample data loaded successfully!');
        console.log(`📊 Generated ${teachers.length} teachers, ${classrooms.length} classrooms, and ${attendance.length} attendance records`);
        console.log(`📅 Dates: ${dates.join(', ')}`);
        console.log(`🔍 Sample attendance record:`, attendance[0]);
    },

    /**
     * Clear all sample data from localStorage
     */
    clearSampleData() {
        localStorage.removeItem('teachers');
        localStorage.removeItem('classrooms');
        localStorage.removeItem('attendance');
        console.log('🗑️ Sample data cleared!');
    },

    /**
     * Check if sample data exists
     */
    hasSampleData() {
        return localStorage.getItem('attendance') !== null;
    },

    /**
     * Get statistics about current data
     */
    getDataStats() {
        const teachers = JSON.parse(localStorage.getItem('teachers') || '[]');
        const classrooms = JSON.parse(localStorage.getItem('classrooms') || '[]');
        const attendance = JSON.parse(localStorage.getItem('attendance') || '[]');

        return {
            teachers: teachers.length,
            classrooms: classrooms.length,
            attendance: attendance.length,
            dates: [...new Set(attendance.map(a => a.date))].sort()
        };
    }
};

// Auto-load sample data if no data exists
// Comment out this line to disable auto-loading
if (!SampleData.hasSampleData()) {
    console.log('📦 No existing data found. Loading sample data...');
    SampleData.loadSampleData();
} else {
    console.log('ℹ️ Sample data already exists. To reload, run: SampleData.clearSampleData(); location.reload()');
    console.log('📊 Current data stats:', SampleData.getDataStats());
}

// Make SampleData globally accessible for debugging
window.SampleData = SampleData;
