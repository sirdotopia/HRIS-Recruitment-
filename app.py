from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
import json
import os
from datetime import datetime
import pandas as pd
import io
from werkzeug.utils import secure_filename

app = Flask(__name__)

# --- CONFIGURATION ---
DATA_FILE = 'data.json'
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- HELPER FUNCTIONS ---
def init_db():
    """Initialize data file with ALL required sections."""
    if not os.path.exists(DATA_FILE):
        initial_data = {
            "requisitions": [],
            "candidates": [],
            "employees": [],
            "referrals": [],           # <--- NEW: For Referrals Tab
            "trainings": [],           # <--- NEW: For L&D Tab
            "performance_reviews": [], # <--- NEW: For Performance Tab
            "audit_log": [],
            "recruiters": ["Hassan", "Shaimaa", "Esraa", "Hussien"]
        }
        with open(DATA_FILE, 'w') as f:
            json.dump(initial_data, f)

    # Ensure upload directory exists
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)

def load_data():
    with open(DATA_FILE, 'r') as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=4)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- ROUTES ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/data', methods=['GET'])
def get_data():
    return jsonify(load_data())

# 1. EXPORT TO EXCEL ROUTE
@app.route('/api/export/<export_type>')
def export_data(export_type):
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

# 2. UPLOAD CV ROUTE
@app.route('/api/upload_cv', methods=['POST'])
def upload_cv():
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'status': 'error', 'message': 'No selected file'}), 400
        
    if file and allowed_file(file.filename):
        # Secure the filename
        original_filename = secure_filename(file.filename)
        # Add timestamp to avoid duplicates
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        new_filename = f"{timestamp}_{original_filename}"
        
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], new_filename))
        
        return jsonify({'status': 'success', 'filename': new_filename})
    
    return jsonify({'status': 'error', 'message': 'File type not allowed'}), 400

# 3. VIEW UPLOADED FILE ROUTE
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# 4. SAVE DATA (UPDATED TO HANDLE ALL TYPES)
@app.route('/api/save', methods=['POST'])
def update_data():
    try:
        new_data = request.json
        current_data = load_data()
        
        action_type = new_data.get('type')
        payload = new_data.get('payload')
        user = new_data.get('user', 'Admin')
        
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = ""

        # 1. حالة إنشاء وظيفة
        if action_type == 'requisition':
            current_data['requisitions'].append(payload)
            log_entry = f"New Job Created: {payload.get('req_id')}"
            
        # 2. حالة تحديث وظيفة
        elif action_type == 'update_requisition':
            for i, req in enumerate(current_data['requisitions']):
                if req['req_id'] == payload['req_id']:
                    current_data['requisitions'][i] = payload
                    break
            log_entry = f"Job Updated: {payload.get('req_id')}"

        # 3. حالة مرشح جديد
        elif action_type == 'candidate':
            current_data['candidates'].append(payload)
            log_entry = f"New Candidate: {payload.get('name')}"
            
        # 4. حالة تحديث مرشح
        elif action_type == 'update_candidate':
            for i, cand in enumerate(current_data['candidates']):
                if cand['id'] == payload['id']:
                    current_data['candidates'][i] = payload
                    break
            log_entry = f"Candidate Status Change: {payload.get('name')} -> {payload.get('status')}"

        # 5. >>> (الربط المفقود) <<< حالة تعيين موظف جديد
        elif action_type == 'hire_employee':
            # التأكد من عدم وجود الموظف سابقاً
            exists = any(emp['code'] == payload['code'] for emp in current_data['employees'])
            if not exists:
                current_data['employees'].append(payload)
                log_entry = f"HIRED: {payload.get('name')} added to Master Data"
            else:
                return jsonify({"status": "error", "message": "Employee already exists"})

        # 6. باقي التابات
        elif action_type == 'referral':
            current_data.setdefault('referrals', []).append(payload)
        elif action_type == 'training':
            current_data.setdefault('trainings', []).append(payload)
        elif action_type == 'performance':
            current_data.setdefault('performance_reviews', []).append(payload)

        # تسجيل الحركة في الـ Audit Log
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
        # --- AUDIT LOGGING ---
        if log_entry:
            audit = {
                "timestamp": timestamp,
                "user": user,
                "action": log_entry
            }
            current_data['audit_log'].insert(0, audit)

        save_data(current_data)
        return jsonify({"status": "success", "message": "Data saved successfully"})
        
    except Exception as e:
        print(f"Error: {e}") 
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    init_db()
    # Create templates/static folders if missing (good practice)
    if not os.path.exists('templates'): os.makedirs('templates')
    if not os.path.exists('static'): os.makedirs('static')
    
    app.run(host='0.0.0.0', debug=True, port=5000)
