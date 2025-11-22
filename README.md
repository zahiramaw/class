# ZCM Track - Teacher Attendance System

A modern, cloud-connected teacher attendance tracking system with QR code scanning, automatic period detection, and comprehensive analytics.

## 🌐 Live URLs

- **Admin Portal**: https://zahiramaw.github.io/Track/admin/
- **Teacher Scanner**: https://zahiramaw.github.io/Track/teacher/

## 📋 Features

- **Cloud Storage** - Data is securely stored in Google Firebase (Firestore)
- **Automatic Period Detection** - System automatically detects current period based on time
- **QR Code Scanning** - Teachers scan classroom QR codes to check in
- **Google Authentication** - Secure admin access with authorized email whitelist
- **Class Period Matrix** - Visual overview of all classes and periods
- **Teacher Statistics** - Detailed attendance tracking per teacher
- **Clean URLs** - User-friendly URLs without `.html` extensions
- **Responsive Design** - Works on desktop and mobile devices

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
├── admin.js                # Admin portal logic (Firebase connected)
├── firebase-init.js        # Firebase configuration
├── schedule.js             # Period definitions
├── styles.css              # All styles
└── index.html              # Root file
```

## 🚀 Deployment

The project is deployed on GitHub Pages. To update:

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

Changes will be live at https://zahiramaw.github.io/Track/ within a few minutes.

## 🛠️ Development

### Local Testing
Because the project now uses ES Modules for Firebase, you **must** use a local server to test.
1. Run `python3 -m http.server` (or use VS Code Live Server)
2. Open `http://localhost:8000/admin/`

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

All data is stored in **Google Firebase Firestore**:
- `teachers` - Teacher information
- `classrooms` - Classroom information
- `attendance` - Attendance records

## 🔧 Troubleshooting

**Google Auth not working?**
- Ensure your domain is added to authorized origins in Google Cloud Console
- Check that your email is in the `authorizedEmails` array

**Data not saving?**
- Check browser console for Firebase errors
- Ensure your internet connection is active

**QR codes not scanning?**
- Ensure camera permissions are granted
- Use HTTPS (required for camera access)
- Try a different browser

## 📝 License

This project is for educational purposes.

## 👥 Support

For issues or questions, contact the system administrator.
