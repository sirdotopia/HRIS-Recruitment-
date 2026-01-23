from flask import Flask, render_template, request, jsonify, send_file, send_from_directory, session, redirect, url_for
from functools import wraps
import json
import os
from datetime import datetime, timedelta
import pandas as pd
import io
from werkzeug.utils import secure_filename
import secrets
import hashlib

app = Flask(__name__)

# --- CONFIGURATION ---
DATA_FILE = 'data.json'
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'}
SESSION_TIMEOUT = 1800  # 30 minutes in seconds

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['SECRET_KEY'] = secrets.token_hex(32)
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(seconds=SESSION_TIMEOUT)

# --- HELPER FUNCTIONS ---
def init_db():
    """Initialize data file with ALL required sections including users."""
    if not os.path.exists(DATA_FILE):
        initial_data = {
            "users": [
                {
                    "username": "admin",
                    "password": hash_password("admin123"),
                    "email": "admin@acrow.com",
                    "role": "Administrator",
                    "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                },
                {
                    "username": "Hassan adel",
                    "password": "2e0228ecd380326593d0e2d415e66c33046b6db600a3a89a5f91ed71a78fcbd3",
                    "email": "hassan.adel@acrow.com",
                    "role": "Recruiter",
                    "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                },
                {
                    "username": "shaimaa",
                    "password": hash_password("shaimaa123"),
                    "email": "shaimaa@acrow.com",
                    "role": "Recruiter",
                    "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
            ],
            "requisitions": [],
            "candidates": [],
            "employees": [],
            "referrals": [],
            "trainings": [],
            "performance_reviews": [],
            "audit_log": [],
            "recruiters": ["Hassan", "Shaimaa", "Esraa", "Hussien"]
        }
        with open(DATA_FILE, 'w') as f:
            json.dump(initial_data, f, indent=4)

    # Ensure upload directory exists
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)

def hash_password(password):
    """Hash password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, hashed):
    """Verify password against hash."""
    return hash_password(password) == hashed

def load_data():
    """Load data from JSON file."""
    with open(DATA_FILE, 'r') as f:
        return json.load(f)

def save_data(data):
    """Save data to JSON file."""
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=4)

def allowed_file(filename):
    """Check if file extension is allowed."""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def login_required(f):
    """Decorator to check if user is logged in."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'status': 'error', 'message': 'Unauthorized', 'redirect': '/login'}), 401
        return f(*args, **kwargs)
    return decorated_function

def get_current_user():
    """Get current logged-in user."""
    if 'user_id' not in session:
        return None
    data = load_data()
    users = data.get('users', [])
    for user in users:
        if user.get('username') == session.get('user_id'):
            return user
    return None

# --- ROUTES ---

@app.route('/')
def index():
    """Main dashboard - redirects to login if not authenticated."""
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Login page and authentication endpoint."""
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()

        if not username or not password:
            return jsonify({'status': 'error', 'message': 'Username and password required'}), 400

        db_data = load_data()
        users = db_data.get('users', [])
        
        user = None
        for u in users:
            if u.get('username').lower() == username.lower():
                user = u
                break

        if user and verify_password(password, user.get('password', '')):
            session.permanent = True
            session['user_id'] = user.get('username')
            session['role'] = user.get('role')
            session['email'] = user.get('email')
            session['login_time'] = datetime.now().isoformat()
            
            # Log login action
            db_data['audit_log'].insert(0, {
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "user": username,
                "action": f"User logged in"
            })
            save_data(db_data)
            
            return jsonify({'status': 'success', 'message': 'Login successful', 'redirect': '/'}), 200
        else:
            return jsonify({'status': 'error', 'message': 'Invalid username or password'}), 401

    return render_template('login.html')

@app.route('/logout', methods=['POST'])
def logout():
    """Logout endpoint."""
    username = session.get('user_id', 'Unknown')
    
    # Log logout action
    db_data = load_data()
    db_data['audit_log'].insert(0, {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "user": username,
        "action": f"User logged out"
    })
    save_data(db_data)
    
    session.clear()
    return jsonify({'status': 'success', 'message': 'Logged out successfully'}), 200

@app.route('/api/session-check', methods=['GET'])
def session_check():
    """Check if session is still valid."""
    if 'user_id' not in session:
        return jsonify({'status': 'error', 'authenticated': False}), 401
    
    user = get_current_user()
    if not user:
        session.clear()
        return jsonify({'status': 'error', 'authenticated': False}), 401
    
    return jsonify({
        'status': 'success',
        'authenticated': True,
        'user': session.get('user_id'),
        'role': session.get('role'),
        'email': session.get('email')
    }), 200

@app.route('/api/data', methods=['GET'])
@login_required
def get_data():
    """Get all system data."""
    data = load_data()
    # Remove sensitive user data from response
    data.pop('users', None)
    return jsonify(data)

# 1. EXPORT TO EXCEL ROUTE
@app.route('/api/export/<export_type>')
@login_required
def export_data(export_type):
    """Export data to Excel format."""
    try:
        data = load_data()
        
        # Safe fetch for export
        export_list = data.get(export_type, [])
        
        # Convert list of dicts to DataFrame
        df = pd.read_json(json.dumps(export_list))
        
        # Create buffer
        output = io.BytesIO()
        
        # Write to Excel
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name=export_type.capitalize())
            
        output.seek(0)
        
        filename = f"{export_type}_report_{datetime.now().strftime('%Y%m%d')}.xlsx"
        return send_file(output, download_name=filename, as_attachment=True, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    except Exception as e:
        return f"Error generating report: {str(e)}", 500

# 2. UPLOAD CV ROUTE (FIXED - Now includes Candidate ID)
@app.route('/api/upload_cv', methods=['POST'])
@login_required
def upload_cv():
    """Upload CV file with candidate ID tracking."""
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file part'}), 400
    
    file = request.files['file']
    candidate_id = request.form.get('candidate_id', 'unknown')
    
    if file.filename == '':
        return jsonify({'status': 'error', 'message': 'No selected file'}), 400
        
    if file and allowed_file(file.filename):
        # Secure the filename
        original_filename = secure_filename(file.filename)
        # Add timestamp and candidate ID to avoid duplicates
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        new_filename = f"{candidate_id}_{timestamp}_{original_filename}"
        
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], new_filename))
        
        # Log file upload
        current_user = session.get('user_id', 'Unknown')
        db_data = load_data()
        db_data['audit_log'].insert(0, {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "user": current_user,
            "action": f"CV uploaded for candidate {candidate_id}: {new_filename}"
        })
        save_data(db_data)
        
        return jsonify({'status': 'success', 'filename': new_filename})
    
    return jsonify({'status': 'error', 'message': 'File type not allowed'}), 400

# 3. VIEW UPLOADED FILE ROUTE
@app.route('/uploads/<filename>')
@login_required
def uploaded_file(filename):
    """Serve uploaded files."""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# 4. DELETE RESOURCE ROUTE
@app.route('/api/delete/<resource_type>/<resource_id>', methods=['DELETE'])
@login_required
def delete_resource(resource_type, resource_id):
    """Delete a resource from the system."""
    try:
        data = load_data()
        current_user = session.get('user_id', 'Unknown')
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Handle different resource types
        if resource_type == 'candidate':
            candidates = data.get('candidates', [])
            for i, candidate in enumerate(candidates):
                if candidate.get('id') == resource_id:
                    deleted_name = candidate.get('name', 'Unknown')
                    candidates.pop(i)
                    data['audit_log'].insert(0, {
                        "timestamp": timestamp,
                        "user": current_user,
                        "action": f"Candidate deleted: {deleted_name}"
                    })
                    save_data(data)
                    return jsonify({'status': 'success', 'message': 'Candidate deleted successfully'}), 200
            return jsonify({'status': 'error', 'message': 'Candidate not found'}), 404
            
        elif resource_type == 'requisition':
            requisitions = data.get('requisitions', [])
            for i, req in enumerate(requisitions):
                if req.get('req_id') == resource_id:
                    deleted_req = req.get('title', 'Unknown')
                    requisitions.pop(i)
                    data['audit_log'].insert(0, {
                        "timestamp": timestamp,
                        "user": current_user,
                        "action": f"Requisition deleted: {deleted_req}"
                    })
                    save_data(data)
                    return jsonify({'status': 'success', 'message': 'Requisition deleted successfully'}), 200
            return jsonify({'status': 'error', 'message': 'Requisition not found'}), 404
            
        elif resource_type == 'employee':
            employees = data.get('employees', [])
            for i, emp in enumerate(employees):
                if emp.get('code') == resource_id:
                    deleted_emp = emp.get('name', 'Unknown')
                    employees.pop(i)
                    data['audit_log'].insert(0, {
                        "timestamp": timestamp,
                        "user": current_user,
                        "action": f"Employee deleted: {deleted_emp}"
                    })
                    save_data(data)
                    return jsonify({'status': 'success', 'message': 'Employee deleted successfully'}), 200
            return jsonify({'status': 'error', 'message': 'Employee not found'}), 404
            
        elif resource_type == 'referral':
            referrals = data.get('referrals', [])
            for i, ref in enumerate(referrals):
                if ref.get('id') == resource_id:
                    deleted_ref = ref.get('name', 'Unknown')
                    referrals.pop(i)
                    data['audit_log'].insert(0, {
                        "timestamp": timestamp,
                        "user": current_user,
                        "action": f"Referral deleted: {deleted_ref}"
                    })
                    save_data(data)
                    return jsonify({'status': 'success', 'message': 'Referral deleted successfully'}), 200
            return jsonify({'status': 'error', 'message': 'Referral not found'}), 404
            
        elif resource_type == 'training':
            trainings = data.get('trainings', [])
            for i, train in enumerate(trainings):
                if train.get('id') == resource_id:
                    deleted_train = train.get('title', 'Unknown')
                    trainings.pop(i)
                    data['audit_log'].insert(0, {
                        "timestamp": timestamp,
                        "user": current_user,
                        "action": f"Training deleted: {deleted_train}"
                    })
                    save_data(data)
                    return jsonify({'status': 'success', 'message': 'Training deleted successfully'}), 200
            return jsonify({'status': 'error', 'message': 'Training not found'}), 404
            
        elif resource_type == 'performance':
            performances = data.get('performance_reviews', [])
            for i, perf in enumerate(performances):
                if perf.get('id') == resource_id:
                    deleted_perf = perf.get('employee_name', 'Unknown')
                    performances.pop(i)
                    data['audit_log'].insert(0, {
                        "timestamp": timestamp,
                        "user": current_user,
                        "action": f"Performance review deleted: {deleted_perf}"
                    })
                    save_data(data)
                    return jsonify({'status': 'success', 'message': 'Performance review deleted successfully'}), 200
            return jsonify({'status': 'error', 'message': 'Performance review not found'}), 404
        
        else:
            return jsonify({'status': 'error', 'message': 'Invalid resource type'}), 400
            
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# 5. SAVE DATA (UPDATED TO HANDLE ALL TYPES)
@app.route('/api/save', methods=['POST'])
@login_required
def update_data():
    """Save or update data in the system."""
    try:
        new_data = request.json
        current_data = load_data()
        
        action_type = new_data.get('type')
        payload = new_data.get('payload')
        user = session.get('user_id', 'Admin')
        
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = ""

        # 1. Create Job Requisition
        if action_type == 'requisition':
            current_data['requisitions'].append(payload)
            log_entry = f"New Job Created: {payload.get('req_id')}"
            
        # 2. Update Job Requisition
        elif action_type == 'update_requisition':
            for i, req in enumerate(current_data['requisitions']):
                if req['req_id'] == payload['req_id']:
                    current_data['requisitions'][i] = payload
                    break
            log_entry = f"Job Updated: {payload.get('req_id')}"

        # 3. New Candidate
        elif action_type == 'candidate':
            current_data['candidates'].append(payload)
            log_entry = f"New Candidate: {payload.get('name')}"
            
        # 4. Update Candidate
        elif action_type == 'update_candidate':
            for i, cand in enumerate(current_data['candidates']):
                if cand['id'] == payload['id']:
                    current_data['candidates'][i] = payload
                    break
            log_entry = f"Candidate Status Change: {payload.get('name')} -> {payload.get('status')}"

        # 5. Hire Employee
        elif action_type == 'hire_employee':
            exists = any(emp['code'] == payload['code'] for emp in current_data['employees'])
            if not exists:
                current_data['employees'].append(payload)
                log_entry = f"HIRED: {payload.get('name')} added to Master Data"
            else:
                return jsonify({"status": "error", "message": "Employee already exists"})

        # 6. Other Tabs
        elif action_type == 'referral':
            current_data.setdefault('referrals', []).append(payload)
            log_entry = f"New Referral: {payload.get('name')}"
        elif action_type == 'training':
            current_data.setdefault('trainings', []).append(payload)
            log_entry = f"New Training: {payload.get('title')}"
        elif action_type == 'performance':
            current_data.setdefault('performance_reviews', []).append(payload)
            log_entry = f"New Performance Review: {payload.get('employee_name')}"

        # Audit Logging
        if log_entry:
            current_data['audit_log'].insert(0, {
                "timestamp": timestamp,
                "user": user,
                "action": log_entry
            })

        save_data(current_data)
        return jsonify({"status": "success", "message": "Action Linked Successfully"})
        
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    init_db()
    # Create templates/static folders if missing
    if not os.path.exists('templates'): os.makedirs('templates')
    if not os.path.exists('static'): os.makedirs('static')
    
    app.run(host='0.0.0.0', debug=True, port=5000)
