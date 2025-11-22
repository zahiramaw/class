const Schedule = {
    // Configuration of periods
    regularPeriods: [
        { id: 1, name: 'Period 1', start: '07:55', end: '08:35' },
        { id: 2, name: 'Period 2', start: '08:35', end: '09:15' },
        { id: 3, name: 'Period 3', start: '09:15', end: '09:55' },
        { id: 4, name: 'Period 4', start: '09:55', end: '10:35' },
        { id: 5, name: 'Period 5', start: '10:35', end: '11:15' },
        { id: 'Interval', name: 'Interval', start: '11:15', end: '11:30', type: 'break' },
        { id: 6, name: 'Period 6', start: '11:30', end: '12:10' },
        { id: 7, name: 'Period 7', start: '12:10', end: '12:50' },
        { id: 8, name: 'Period 8', start: '12:50', end: '13:30' },
        { id: 9, name: 'Period 9', start: '13:30', end: '14:10' }
    ],

    fridayPeriods: [
        { id: 1, name: 'Period 1', start: '07:55', end: '08:35' },
        { id: 2, name: 'Period 2', start: '08:35', end: '09:15' },
        { id: 3, name: 'Period 3', start: '09:15', end: '09:55' },
        { id: 4, name: 'Period 4', start: '09:55', end: '10:35' },
        { id: 5, name: 'Period 5', start: '10:35', end: '11:15' }
    ],

    // Helper to convert "HH:MM" to minutes from midnight
    toMinutes(timeStr) {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    },

    // Get periods for a specific date
    getPeriods(date = new Date()) {
        const day = date.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
        if (day === 5) {
            return this.fridayPeriods;
        }
        return this.regularPeriods;
    },

    // Get the current period based on a Date object (defaults to now)
    getCurrentPeriod(date = new Date()) {
        const currentMins = date.getHours() * 60 + date.getMinutes();
        const periods = this.getPeriods(date);
        
        return periods.find(p => {
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
