# ACROW HRIS System - New Edition Implementation Guide

## Overview
This document provides comprehensive instructions for integrating the new edition files into your existing HRIS system. All new features have been implemented in separate files to ensure easy integration and minimal disruption to your current system.

## New Edition Files

### Backend Files
1. **`app.new.edition.py`** - Enhanced Flask application with authentication, session management, and delete functions

### Frontend Files
1. **`html.login.new.edition.html`** - New login page with company branding and authentication
2. **`html.index.new.edition.html`** - Enhanced dashboard with session management and logout button
3. **`js.session.management.new.edition.js`** - Session management, toast notifications, and delete functions

### Assets
1. **`images/logo.png`** - Company logo (ACROW Formwork Technology)

## Installation & Integration Steps

### Step 1: Backup Current Files
Before proceeding, create a backup of your current files:
```bash
cp app.py app.py.backup
cp index.html index.html.backup
cp script.js script.js.backup
```

### Step 2: Replace Backend File
Replace your current `app.py` with the new edition:
```bash
cp app.new.edition.py app.py
```

**Key Changes in New Backend:**
- User authentication system with password hashing (SHA-256)
- Session management with 30-minute timeout
- Login and logout endpoints
- Session validation endpoint (`/api/session-check`)
- Delete endpoints for all resource types
- Enhanced file upload with Candidate ID tracking
- Audit logging for all actions

### Step 3: Replace Frontend Files
Replace your current HTML and JavaScript files:
```bash
cp html.login.new.edition.html login.html
cp html.index.new.edition.html index.html
cp js.session.management.new.edition.js session-management.js
```

**Important:** Update the script references in your `index.html`:
```html
<!-- Add this line before your existing script.js -->
<script src="session-management.js"></script>
```

### Step 4: Update Your Existing script.js
Your current `script.js` should remain unchanged. The new session management script will work alongside it.

### Step 5: Verify Assets
Ensure the logo is in the correct location:
```bash
mkdir -p images
# Logo should be at: images/logo.png
```

## User Credentials

### Default Login Credentials
- **Username:** Hassan adel
- **Password:** sirdo#@01

### Additional Demo Accounts
- **admin** / **admin123** (Administrator role)
- **shaimaa** / **shaimaa123** (Recruiter role)

## Features Implemented

### 1. Authentication System
- Secure login page with company branding
- Password hashing using SHA-256
- Session-based authentication
- "Remember me" functionality
- Automatic redirect for already-logged-in users

### 2. Session Management
- 30-minute session timeout
- Automatic session validity checks every 5 minutes
- Activity-based session reset (clicks, keypresses, mouse movement)
- Automatic logout on session expiration
- Session check endpoint for frontend validation

### 3. Logout Functionality
- Logout button in navigation bar
- Secure session termination
- Audit logging of logout actions
- Redirect to login page after logout

### 4. Delete Functions
Implemented for all resource types:
- **Candidates** - Delete candidate records
- **Requisitions** - Delete job postings
- **Employees** - Delete employee records
- **Referrals** - Delete referral records
- **Training** - Delete training programs
- **Performance Reviews** - Delete performance reviews

Each delete operation includes:
- Confirmation dialog
- Audit logging
- Toast notification feedback
- Data reload after deletion

### 5. Toast Notifications
Dynamic notification system with:
- **Success** notifications (green)
- **Error** notifications (red)
- **Warning** notifications (yellow)
- **Info** notifications (blue)
- Auto-dismiss after 4 seconds
- Manual close button
- Smooth animations

### 6. File Upload Enhancement
- Candidate ID is now included in uploaded file names
- Format: `{candidate_id}_{timestamp}_{filename}`
- Audit logging of all uploads
- Better tracking and organization

### 7. Enhanced Fetch Calls
All API calls now use the `authenticatedFetch()` wrapper which:
- Automatically includes authentication headers
- Handles 401 unauthorized responses
- Triggers session expiration handling
- Maintains consistent error handling

### 8. Data Cohesion
All operations are linked to the authenticated user:
- Every action is logged in the audit trail
- User information is stored in session
- All data modifications are tracked
- Dashboard displays user-specific information

## Integration with Existing Code

### Maintaining Current Layout
The new edition preserves your existing dashboard layout:
- All tabs remain in the same order
- Card styling is unchanged
- Table layouts are preserved
- Existing functionality continues to work

### Code Line Count
All new files maintain or exceed the original line count:
- **app.py**: Original (~211 lines) → New Edition (~430+ lines)
- **index.html**: Original (~126 lines) → New Edition (~260+ lines)
- **Session Management**: New file (~440+ lines)

### Backward Compatibility
The new edition is fully backward compatible:
- Existing `script.js` continues to work
- Current CSS styling is preserved
- All existing API endpoints remain functional
- New endpoints are additive, not replacement

## API Endpoints

### Authentication
- `POST /login` - User login
- `POST /logout` - User logout
- `GET /api/session-check` - Check session validity

### Data Operations
- `GET /api/data` - Get all system data (requires authentication)
- `POST /api/save` - Save/update data (requires authentication)
- `DELETE /api/delete/{resource_type}/{resource_id}` - Delete resource

### File Operations
- `POST /api/upload_cv` - Upload CV with candidate ID
- `GET /uploads/{filename}` - Download uploaded file
- `GET /api/export/{export_type}` - Export data to Excel

## Security Features

### Password Security
- Passwords are hashed using SHA-256
- Hashes are stored in `data.json`
- Plain text passwords are never stored or transmitted

### Session Security
- Session cookies are HTTP-only
- Session timeout prevents unauthorized access
- Activity-based reset extends valid sessions
- Automatic logout on inactivity

### Audit Logging
All actions are logged including:
- User logins and logouts
- Data creation and updates
- File uploads
- Data deletions
- Failed login attempts

## Troubleshooting

### Issue: Login page shows 404
**Solution:** Ensure `login.html` is in the correct location and Flask is configured to serve it.

### Issue: Logo not displaying
**Solution:** Verify that `images/logo.png` exists and the path is correct in the HTML files.

### Issue: Session expires too quickly
**Solution:** Adjust `SESSION_TIMEOUT` in `app.new.edition.py` (currently 1800 seconds = 30 minutes).

### Issue: Toast notifications not showing
**Solution:** Ensure `js.session.management.new.edition.js` is loaded before other scripts.

### Issue: Delete buttons not working
**Solution:** Verify that the delete endpoint is properly configured in the backend and the resource IDs match.

## Database Structure

The system uses a JSON file (`data.json`) with the following structure:
```json
{
    "users": [...],
    "requisitions": [...],
    "candidates": [...],
    "employees": [...],
    "referrals": [...],
    "trainings": [...],
    "performance_reviews": [...],
    "audit_log": [...]
}
```

## Performance Considerations

- Session checks occur every 5 minutes (configurable)
- Toast notifications auto-dismiss after 4 seconds
- Activity-based session reset prevents unnecessary logouts
- Audit logging is asynchronous and non-blocking

## Future Enhancements

Potential improvements for future versions:
- Database migration to SQL (MySQL/PostgreSQL)
- Two-factor authentication
- Role-based access control (RBAC)
- Email notifications
- Advanced audit reporting
- User management interface

## Support & Documentation

For additional support or questions:
1. Review the inline code comments in each file
2. Check the audit log for action history
3. Verify session status using `/api/session-check`
4. Test delete functions with confirmation dialogs

## Version Information

- **System Version:** 5.0 (New Edition)
- **Release Date:** 2024
- **Compatibility:** Flask, Python 3.7+
- **Browser Support:** Chrome, Firefox, Safari, Edge (latest versions)

## Changelog

### Version 5.0 (New Edition)
- Added complete authentication system
- Implemented session management with timeouts
- Added logout functionality
- Implemented delete functions for all resources
- Added toast notification system
- Enhanced file upload with Candidate ID
- Updated all fetch calls for authentication
- Improved audit logging
- Added company branding (ACROW logo)

### Version 4.0 (Previous)
- Basic HRIS functionality
- Dashboard with tabs
- Data export to Excel
- File upload capability

---

**Last Updated:** 2024
**Status:** Production Ready
