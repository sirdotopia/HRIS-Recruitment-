# ACROW Talent Acquisition HRIS - New Edition

## Project Overview

This is an enhanced version of the ACROW Talent Acquisition HRIS (Human Resources Information System) and ATS (Applicant Tracking System). The new edition includes comprehensive authentication, session management, delete functions, and improved user experience with toast notifications.

## What's New in This Edition

### 🔐 Security Features
- **User Authentication**: Secure login system with SHA-256 password hashing
- **Session Management**: 30-minute timeout with activity-based reset
- **Audit Logging**: Complete tracking of all user actions
- **Secure Logout**: Proper session termination and cleanup

### 🎨 User Interface Improvements
- **Company Branding**: ACROW logo integrated throughout the system
- **Toast Notifications**: Real-time feedback for all operations
- **Logout Button**: Easy access in the navigation bar
- **Enhanced Login Page**: Professional design with company identity

### 🗑️ Data Management
- **Delete Functions**: Safe deletion of all resource types with confirmation
- **Delete Confirmations**: User confirmation before permanent deletion
- **Audit Trail**: All deletions are logged for compliance

### 📁 File Upload
- **Candidate ID Tracking**: Files are automatically linked to candidates
- **Organized Storage**: Files named with candidate ID and timestamp
- **Upload Logging**: All uploads are recorded in audit trail

### 🔄 Integration
- **Authenticated Fetch**: All API calls include authentication
- **Session Validation**: Automatic session checking and renewal
- **Error Handling**: Comprehensive error management and user feedback

## New Edition Files

### Backend
- **`app.new.edition.py`** - Enhanced Flask application with all new features

### Frontend
- **`html.login.new.edition.html`** - Professional login page
- **`html.index.new.edition.html`** - Enhanced dashboard
- **`js.session.management.new.edition.js`** - Session and notification management

### Documentation
- **`IMPLEMENTATION_GUIDE.new.edition.md`** - Detailed integration instructions
- **`README.new.edition.md`** - This file

### Assets
- **`images/logo.png`** - ACROW company logo

## Quick Start

### Prerequisites
- Python 3.7 or higher
- Flask
- pandas
- openpyxl

### Installation

1. **Replace Backend File**
   ```bash
   cp app.new.edition.py app.py
   ```

2. **Replace Frontend Files**
   ```bash
   cp html.login.new.edition.html login.html
   cp html.index.new.edition.html index.html
   cp js.session.management.new.edition.js session-management.js
   ```

3. **Ensure Logo is in Place**
   ```bash
   mkdir -p images
   # Verify logo.png is in the images directory
   ```

4. **Update index.html Script References**
   Add this line before your existing script.js:
   ```html
   <script src="session-management.js"></script>
   ```

5. **Run the Application**
   ```bash
   python app.py
   ```

6. **Access the System**
   - Navigate to `http://localhost:5000/login`
   - Login with credentials: **Hassan adel** / **sirdo#@01**

## Default Credentials

| Username | Password | Role |
|----------|----------|------|
| Hassan adel | sirdo#@01 | Recruiter |
| admin | admin123 | Administrator |
| shaimaa | shaimaa123 | Recruiter |

## System Architecture

### Frontend Components
- **Login Page**: Standalone authentication interface
- **Dashboard**: Main application interface with multiple tabs
- **Session Manager**: Handles authentication and timeouts
- **Toast Notifications**: Real-time user feedback system

### Backend Components
- **Authentication**: Login/logout endpoints
- **Session Management**: Session validation and timeout handling
- **Data Management**: CRUD operations with audit logging
- **File Management**: Upload and download with candidate linking
- **Delete Operations**: Safe deletion with confirmation and logging

### Data Storage
- **Format**: JSON file (`data.json`)
- **Structure**: Organized by resource type (users, candidates, requisitions, etc.)
- **Audit Log**: Complete action history with timestamps

## Features

### 1. User Authentication
- Secure login with email/password
- Password hashing using SHA-256
- Session-based authentication
- "Remember me" functionality

### 2. Session Management
- 30-minute session timeout
- Activity-based session reset
- Automatic logout on expiration
- Session validity checks

### 3. Dashboard
- Multiple tabs for different functions:
  - Dashboard (Overview)
  - Job Requisition (Job postings)
  - ATS & Pipeline (Candidate tracking)
  - Referrals (Employee referrals)
  - Employee Master Data (Employee records)
  - L&D / Training (Training programs)
  - Performance (Performance reviews)
  - Positions Status (Position tracking)
  - Audit & Compliance (Action history)

### 4. Data Operations
- Create new records
- Update existing records
- Delete records with confirmation
- Export to Excel
- View audit logs

### 5. File Management
- Upload CV files
- Automatic candidate linking
- Organized file storage
- Download uploaded files

### 6. Notifications
- Success messages (green)
- Error messages (red)
- Warning messages (yellow)
- Info messages (blue)
- Auto-dismiss or manual close

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | User login |
| POST | `/logout` | User logout |
| GET | `/api/session-check` | Check session validity |

### Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/data` | Get all system data |
| POST | `/api/save` | Save/update data |
| DELETE | `/api/delete/{type}/{id}` | Delete resource |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload_cv` | Upload CV file |
| GET | `/uploads/{filename}` | Download file |
| GET | `/api/export/{type}` | Export to Excel |

## Security

### Password Protection
- SHA-256 hashing algorithm
- Secure password storage
- No plain text transmission

### Session Security
- HTTP-only cookies
- CSRF protection
- Session timeout
- Activity monitoring

### Audit Trail
- All actions logged
- User attribution
- Timestamp recording
- Data change tracking

## File Structure

```
HRIS-Recruitment-/
├── app.new.edition.py              # Enhanced backend
├── html.login.new.edition.html      # Login page
├── html.index.new.edition.html      # Dashboard
├── js.session.management.new.edition.js  # Session management
├── images/
│   └── logo.png                     # Company logo
├── IMPLEMENTATION_GUIDE.new.edition.md   # Integration guide
├── README.new.edition.md            # This file
├── data.json                        # System database
├── uploads/                         # Uploaded files
└── [existing files]
```

## Configuration

### Session Timeout
Edit `app.new.edition.py`:
```python
SESSION_TIMEOUT = 1800  # 30 minutes in seconds
```

### Session Check Interval
Edit `js.session.management.new.edition.js`:
```javascript
setInterval(checkSessionValidity, 300000);  // 5 minutes
```

### Toast Notification Duration
```javascript
showToast(message, type, 4000);  // 4 seconds
```

## Troubleshooting

### Login Issues
- Verify credentials are correct
- Check if user exists in `data.json`
- Clear browser cache and cookies

### Session Timeout Issues
- Adjust `SESSION_TIMEOUT` value
- Check browser console for errors
- Verify network connectivity

### File Upload Issues
- Check upload folder permissions
- Verify file type is allowed
- Ensure candidate ID is provided

### Notification Issues
- Verify JavaScript is enabled
- Check browser console for errors
- Ensure CSS is properly loaded

## Browser Compatibility

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

## Performance

- Session checks: Every 5 minutes
- Toast auto-dismiss: 4 seconds
- Session timeout: 30 minutes
- Activity reset: Immediate

## Support

For issues or questions:
1. Check the IMPLEMENTATION_GUIDE.new.edition.md
2. Review browser console for errors
3. Check audit log for action history
4. Verify all files are in correct locations

## License

This project is proprietary software for ACROW Formwork Technology.

## Version

- **Current Version**: 5.0 (New Edition)
- **Release Date**: 2024
- **Status**: Production Ready

## Changelog

### Version 5.0
- Added complete authentication system
- Implemented session management
- Added logout functionality
- Implemented delete functions
- Added toast notifications
- Enhanced file upload
- Updated all fetch calls
- Improved audit logging
- Added company branding

### Version 4.0
- Initial HRIS functionality
- Dashboard with tabs
- Data export
- File upload

---

**For detailed integration instructions, please refer to `IMPLEMENTATION_GUIDE.new.edition.md`**
