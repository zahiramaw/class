# ZCM Track - Teacher Attendance System

A modern, browser-based teacher attendance tracking system with QR code scanning, automatic period detection, and comprehensive analytics.

## 🌐 Live URLs

- **Admin Portal**: https://zahiramaw.github.io/class/admin/
- **Teacher Scanner**: https://zahiramaw.github.io/class/teacher/

## 📋 Features

- **Automatic Period Detection** - System automatically detects current period based on time
- **QR Code Scanning** - Teachers scan classroom QR codes to check in
- **Google Authentication** - Secure admin access with authorized email whitelist
- **Class Period Matrix** - Visual overview of all classes and periods
- **Teacher Statistics** - Detailed attendance tracking per teacher
- **Clean URLs** - User-friendly URLs without `.html` extensions
- **Responsive Design** - Works on desktop and mobile devices

## 🧪 Sample Data

The system includes comprehensive test data for demonstration purposes:

### What's Included
- **10 Teachers** across various subjects
- **36 Classrooms** (Grades 6-11, Sections A-E2)
- **Attendance Records** for 3 days (Nov 22, 21, 20, 2024)
- Realistic distribution:
  - 70% on-time arrivals
  - 15% slightly late (6-15 minutes)
  - 10% very late (16-30 minutes)
  - 5% absent

### How to Remove Sample Data

**Option 1: Remove the script tag**
In both `index.html` and `admin/index.html`, remove or comment out this line:
```html
<!-- Sample Data (Remove this line to disable test data) -->
<script src="sample-data.js"></script>
```

**Option 2: Clear from browser**
1. Open the Admin Portal
2. Go to the Admin tab
3. Click "Reset System" button
4. Confirm the action

**Option 3: Delete the file**
Simply delete `sample-data.js` from the project

### How to Customize Sample Data

Edit `sample-data.js` and modify:
- `teachers` array - Add/remove teachers
- `dates` array - Change the dates for sample data
- Status distribution percentages in the attendance generation logic

## 🔐 Admin Access

Only authorized Gmail accounts can access the admin portal. To add/remove authorized emails:

1. Open `admin.js`
2. Find the `authorizedEmails` array
3. Add or remove email addresses


## 📁 File Structure

```
scanqr/
├── admin/
│   └── index.html          # Admin portal (clean URL)
├── teacher/
│   └── index.html          # Teacher scanner (clean URL)
├── admin.js                # Admin portal logic
├── sample-data.js          # Test data (can be removed)
├── schedule.js             # Period definitions
├── styles.css              # All styles
├── index.html              # Root file
└── teacher.html            # Legacy teacher page
```

## 🚀 Deployment

The project is deployed on GitHub Pages. To update:

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

Changes will be live at https://zahiramaw.github.io/class/ within a few minutes.

## 🛠️ Development

### Local Testing
Simply open `index.html` or `admin/index.html` in a browser. The system uses localStorage for data persistence.

### Period Configuration
Edit `schedule.js` to modify:
- Period start/end times
- Break times
- Late threshold (currently 5 minutes)

### Styling
All styles are in `styles.css` with CSS variables for easy theming:
- `--color-maroon`: #800000
- `--color-blue`: #003366
- `--color-gray`: #6B7280

## 📊 Data Storage

All data is stored in browser localStorage:
- `teachers` - Teacher information
- `classrooms` - Classroom information
- `attendance` - Attendance records

## 🔧 Troubleshooting

**Google Auth not working?**
- Ensure your domain is added to authorized origins in Google Cloud Console
- Check that your email is in the `authorizedEmails` array

**Sample data not loading?**
- Check browser console for errors
- Ensure `sample-data.js` is included before `admin.js`
- Clear localStorage and refresh

**QR codes not scanning?**
- Ensure camera permissions are granted
- Use HTTPS (required for camera access)
- Try a different browser

## 📝 License

This project is for educational purposes.

## 👥 Support

For issues or questions, contact the system administrator.
