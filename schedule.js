const Schedule = {
    // Configuration of periods
    periods: [
        { id: 1, name: 'Period 1', start: '07:45', end: '08:20' },
        { id: 2, name: 'Period 2', start: '08:20', end: '08:55' },
        { id: 3, name: 'Period 3', start: '08:55', end: '09:30' },
        { id: 4, name: 'Period 4', start: '09:30', end: '10:05' },
        { id: 'Interval', name: 'Interval', start: '10:05', end: '10:25', type: 'break' },
        { id: 5, name: 'Period 5', start: '10:25', end: '11:00' },
        { id: 6, name: 'Period 6', start: '11:00', end: '11:35' },
        { id: 7, name: 'Period 7', start: '11:35', end: '12:10' },
        { id: 8, name: 'Period 8', start: '12:10', end: '12:45' },
        { id: 9, name: 'Period 9', start: '12:45', end: '13:20' }
    ],

    // Helper to convert "HH:MM" to minutes from midnight
    toMinutes(timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    },

    // Get the current period based on a Date object (defaults to now)
    getCurrentPeriod(date = new Date()) {
        const currentMins = date.getHours() * 60 + date.getMinutes();
        
        return this.periods.find(p => {
            const start = this.toMinutes(p.start);
            const end = this.toMinutes(p.end);
            return currentMins >= start && currentMins < end;
        });
    },

    // Get status (On Time / Late) based on period start time
    // Returns { status: 'On Time' | 'Late', delayMins: 0 }
    calculateStatus(period, checkInDate) {
        if (!period || period.type === 'break') return { status: 'N/A', delayMins: 0 };

        const startMins = this.toMinutes(period.start);
        const checkInMins = checkInDate.getHours() * 60 + checkInDate.getMinutes();
        
        const diff = checkInMins - startMins;
        
        if (diff <= 5) return { status: 'On Time', delayMins: diff };
        return { status: 'Late', delayMins: diff };
    }
};
