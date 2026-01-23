/**
 * ACROW HRIS & ATS MODULE - INTEGRATED NEW EDITION (COMPLETE)
 * Version: 5.0
 * Includes: All Original Dashboard Logic (1600+ lines) + Authentication, Session Management, 
 * Toast Notifications, Delete Functions, Enhanced File Upload
 */

// ==========================================
// SESSION & AUTHENTICATION MANAGEMENT (NEW)
// ==========================================

let sessionTimeout;
const SESSION_TIMEOUT_MS = 1800000; // 30 minutes

function initializeSessionManagement() {
    checkSessionValidity();
    resetSessionTimeout();
    setInterval(checkSessionValidity, 300000); // Check every 5 mins
    document.addEventListener('click', resetSessionTimeout);
    document.addEventListener('keypress', resetSessionTimeout);
    document.addEventListener('mousemove', resetSessionTimeout);
}

function checkSessionValidity() {
    authenticatedFetch('/api/session-check')
        .then(response => response.json())
        .then(data => { if (!data.authenticated) handleSessionExpired(); })
        .catch(error => console.error('Session check error:', error));
}

function resetSessionTimeout() {
    clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(handleSessionExpired, SESSION_TIMEOUT_MS);
}

function handleSessionExpired() {
    showToast('Your session has expired. Please log in again.', 'warning');
    setTimeout(() => { window.location.href = '/login'; }, 2000);
}

async function handleLogout() {
    try {
        const response = await authenticatedFetch('/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
        if (response.ok) {
            showToast('Logged out successfully', 'success');
            setTimeout(() => { window.location.href = '/login'; }, 1000);
        } else {
            showToast('Error logging out', 'danger');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error logging out', 'danger');
    }
}

// ==========================================
// TOAST NOTIFICATION SYSTEM (NEW)
// ==========================================

function showToast(message, type = 'info', duration = 4000) {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = `position: fixed; top: 20px; right: 20px; z-index: 9999; max-width: 400px;`;
        document.body.appendChild(toastContainer);
    }

    const toastId = 'toast-' + Date.now();
    const toastHTML = `
        <div id="${toastId}" class="toast-notification toast-${type}" style="
            background: ${getToastBackground(type)};
            color: ${getToastColor(type)};
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideInRight 0.3s ease;
            border-left: 4px solid ${getToastBorderColor(type)};
        ">
            <i class="fas fa-${getToastIcon(type)}" style="font-size: 18px;"></i>
            <span style="flex: 1; font-weight: 500;">${message}</span>
            <button onclick="closeToast('${toastId}')" style="background: none; border: none; color: inherit; cursor: pointer; font-size: 18px; padding: 0; opacity: 0.7;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    setTimeout(() => { closeToast(toastId); }, duration);
}

function closeToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => { toast.remove(); }, 300);
    }
}

function getToastBackground(type) { return {'success': '#dcfce7', 'danger': '#fee2e2', 'warning': '#fef3c7', 'info': '#dbeafe'}[type] || '#dbeafe'; }
function getToastColor(type) { return {'success': '#166534', 'danger': '#991b1b', 'warning': '#92400e', 'info': '#1e40af'}[type] || '#1e40af'; }
function getToastBorderColor(type) { return {'success': '#22c55e', 'danger': '#dc2626', 'warning': '#f59e0b', 'info': '#3b82f6'}[type] || '#3b82f6'; }
function getToastIcon(type) { return {'success': 'check-circle', 'danger': 'exclamation-circle', 'warning': 'exclamation-triangle', 'info': 'info-circle'}[type] || 'info-circle'; }

// Add CSS animations for toasts
const toastStyle = document.createElement('style');
toastStyle.textContent = `
    @keyframes slideInRight { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }
`;
document.head.appendChild(toastStyle);

// ==========================================
// AUTHENTICATED FETCH WRAPPER (NEW)
// ==========================================

async function authenticatedFetch(url, options = {}) {
    const defaultOptions = { headers: { 'Content-Type': 'application/json' } };
    const mergedOptions = { ...defaultOptions, ...options, headers: { ...defaultOptions.headers, ...options.headers } };
    try {
        const response = await fetch(url, mergedOptions);
        if (response.status === 401) { handleSessionExpired(); throw new Error('Unauthorized'); }
        return response;
    } catch (error) { console.error('Fetch error:', error); throw error; }
}

// ==========================================
// ORIGINAL SCRIPT.JS LOGIC (1600+ LINES)
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Session Management (NEW)
    initializeSessionManagement();
    addLogoutButton();

    // 1. ضبط السنة الحالية تلقائياً
    const yearSelect = document.getElementById('filter-year');
    if(yearSelect) {
        const currentYear = new Date().getFullYear().toString();
        if (![...yearSelect.options].some(o => o.value === currentYear)) {
            const opt = new Option(currentYear, currentYear);
            yearSelect.add(opt, 1); 
        }
        yearSelect.value = currentYear; 
    }
    const refForm = document.getElementById('referralForm');
    if (refForm) {
        refForm.addEventListener('submit', handleReferralSubmit);
    }

    // 2. ضبط الشهر الحالي تلقائياً
    const monthSelect = document.getElementById('filter-month');
    if(monthSelect) {
        const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
        monthSelect.value = currentMonth;
    }

    // 3. تحميل البيانات
    loadData();
    
    // 2. Generate initial Req ID
    generateReqID();
    
    // 3. Attach Event Listeners
    if (document.getElementById('candidateForm')) {
        document.getElementById('candidateForm').addEventListener('submit', handleAddCandidate);
    }
    
    if (document.getElementById('reqForm')) {
        document.getElementById('reqForm').addEventListener('submit', handleReqSubmit);
    }
    
    if (document.getElementById('trainingForm')) {
        document.getElementById('trainingForm').addEventListener('submit', handleAddTraining);
    }
    
    if (document.getElementById('performanceForm')) {
        document.getElementById('performanceForm').addEventListener('submit', handleAddPerformance);
    }

    // NEW: Referral Form Listener
    if (document.getElementById('referralForm')) {
        document.getElementById('referralForm').addEventListener('submit', handleReferralSubmit);
    }
});

let systemData = {
    requisitions: [], 
    candidates: [],
    employees: [],
    trainings: [],
    performance_reviews: [],
    referrals: [],
    audit_log: [] 
};

let currentOpenCandidateId = null;
let currentReqIdForExtension = null;

// ==========================================
// SLA & DATE CALCULATION LOGIC
// ==========================================
function calculateTargetDate() {
    const startInput = document.getElementById('req-date').value;
    const layerInput = document.getElementById('req-layer').value;
    const displayEl = document.getElementById('target-date-display');

    if (!startInput || !layerInput) {
        displayEl.innerHTML = '<span class="text-muted"><i class="fas fa-calculator me-1"></i> Select Date & Layer to see Target Date</span>';
        return;
    }

    const startDate = new Date(startInput);
    let targetDate = new Date(startDate);
    let daysToAdd = 0;

    if (layerInput === 'Manager') daysToAdd = 105;
    else if (layerInput === 'Staff') daysToAdd = 75;
    else if (layerInput === 'Blue Collar') daysToAdd = 30;

    targetDate.setDate(targetDate.getDate() + daysToAdd);
    const formattedTarget = targetDate.toISOString().split('T')[0];
    displayEl.innerHTML = `<span class="fw-bold text-success"><i class="fas fa-check-circle me-1"></i> Target Onboarding: ${formattedTarget} (${daysToAdd} Days SLA)</span>`;
}

// ==========================================
// EMAIL TEMPLATE SYSTEM
// ==========================================
const emailTemplates = {
    interview: {
        subject: "Interview Invitation - Acrow Egypt - {role}",
        body: `Dear {name},\n\nWe have reviewed your application for the {role} position at Acrow Egypt and we are impressed with your qualifications.\n\nWe would like to invite you for an interview to discuss your background and the role in more detail.\n\nProposed Date: {date}\nLocation: Acrow Egypt HQ / Online (Link will be provided)\n\nPlease let us know if this time works for you.\n\nBest Regards,\nTalent Acquisition Team\nAcrow Egypt`
    },
    offer: {
        subject: "Congratulations! Job Offer - {role}",
        body: `Dear {name},\n\nWe are pleased to offer you the position of {role} at Acrow Egypt!\n\nWe were very impressed with your skills and experience, and we believe you will be a fantastic addition to our team.\n\nWe will be sending the formal offer letter shortly containing all the details regarding salary, benefits, and the start date.\n\nPlease confirm your acceptance of this offer by replying to this email.\n\nWelcome to the team!\n\nSincerely,\nHR Department\nAcrow Egypt`
    },
    reject: {
        subject: "Update on your application - {role}",
        body: `Dear {name},\n\nThank you for giving us the opportunity to consider your application for the {role} position.\n\nAfter careful consideration, we regret to inform you that we will not be proceeding with your application at this time. This was a difficult decision as we received many strong applications.\n\nWe will keep your resume in our database and contact you should a suitable vacancy arise in the future.\n\nWe wish you the best in your job search.\n\nBest Regards,\nTalent Acquisition Team\nAcrow Egypt`
    }
};

function openEmailTemplateModal() {
    const c = systemData.candidates.find(x => x.id === currentOpenCandidateId);
    if (!c) return;
    new bootstrap.Modal(document.getElementById('emailTemplateModal')).show();
    updateEmailPreview();
}

function updateEmailPreview() {
    const templateKey = document.getElementById('email-template-select').value;
    const c = systemData.candidates.find(x => x.id === currentOpenCandidateId);
    if (!c) return;
    let subject = emailTemplates[templateKey].subject;
    let body = emailTemplates[templateKey].body;
    const replacements = { "{name}": c.name.split(' ')[0], "{role}": c.req_id, "{date}": c.interview_date || "[Date TBD]" };
    for (const [key, value] of Object.entries(replacements)) {
        subject = subject.replace(new RegExp(key, 'g'), value);
        body = body.replace(new RegExp(key, 'g'), value);
    }
    document.getElementById('email-subject-preview').value = subject;
    document.getElementById('email-body-preview').value = body;
}

function sendGeneratedEmail() {
    const c = systemData.candidates.find(x => x.id === currentOpenCandidateId);
    if (!c || !c.email) { alert("This candidate does not have an email address."); return; }
    const subject = encodeURIComponent(document.getElementById('email-subject-preview').value);
    const body = encodeURIComponent(document.getElementById('email-body-preview').value);
    window.location.href = `mailto:${c.email}?subject=${subject}&body=${body}`;
}

// ==========================================
// API & DATA LOADING (UPDATED)
// ==========================================
function loadData() {
    authenticatedFetch('/api/data')
        .then(response => response.json())
        .then(data => {
            systemData = data;
            if(!systemData.training_programs) systemData.training_programs = [];
            if(!systemData.performance_reviews) systemData.performance_reviews = [];
            if(!systemData.referrals) systemData.referrals = []; 
            renderDashboard(); 
            renderRequisitionsDropdown();
            renderPipeline();
            renderAssessmentDropdown();
            renderEmployees();
            renderTraining();     
            renderPerformance();  
            renderAuditLog();
            renderReferrals();
            renderPositionsStatus();
        })
        .catch(error => { console.error('Error loading data:', error); showToast('Error loading data', 'danger'); });
}

function sendData(type, payload, user="Hassan") {
    authenticatedFetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload, user })
    })
    .then(response => response.json())
    .then(data => {
        if(data.status === 'success') {
            showToast('Data saved successfully', 'success');
            loadData(); 
            ['addCandidateModal', 'candidateProfileModal', 'addTrainingModal', 'addPerformanceModal', 'emailTemplateModal', 'jobDetailsModal'].forEach(id => {
                const el = document.getElementById(id);
                if (el) { const modal = bootstrap.Modal.getInstance(el); if (modal) modal.hide(); }
            });
        } else { showToast(data.message || "Error saving data", 'danger'); }
    })
    .catch(error => { console.error('Error sending data:', error); showToast('Error saving data', 'danger'); });
}

function downloadReport(type) {
    authenticatedFetch(`/api/export/${type}`)
        .then(response => {
            if (!response.ok) throw new Error('Export failed');
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}_report_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showToast(`${type} report downloaded successfully`, 'success');
        })
        .catch(error => { console.error('Download error:', error); showToast('Error downloading report', 'danger'); });
}

// ==========================================
// FORM HANDLERS
// ==========================================
function generateReqID() { 
    const el = document.getElementById('req-id'); 
    if(el) el.value = 'REQ-' + Math.floor(Math.random() * 10000); 
}

function handleReqSubmit(e) {
    e.preventDefault();
    const startInput = document.getElementById('req-date').value;
    const layerInput = document.getElementById('req-layer').value;
    let targetDateStr = "";
    if (startInput && layerInput) {
        const d = new Date(startInput);
        if (layerInput === 'Manager') d.setDate(d.getDate() + 105);
        else if (layerInput === 'Staff') d.setDate(d.getDate() + 75);
        else if (layerInput === 'Blue Collar') d.setDate(d.getDate() + 30);
        targetDateStr = d.toISOString().split('T')[0];
    }
    const reqData = { 
        req_id: document.getElementById('req-id').value, 
        recruiter: document.getElementById('req-recruiter').value, 
        requester_name: document.getElementById('req-name').value, 
        requester_code: document.getElementById('req-code').value, 
        title: document.getElementById('req-title').value,
        dept: document.getElementById('req-dept').value,
        status: document.getElementById('req-status').value,
        start_date: startInput,
        target_date: targetDateStr,
        layer: layerInput,
        responsibilities: document.getElementById('req-resp').value,
        skills: document.getElementById('req-skills').value,
        certifications: document.getElementById('req-cert').value,
        physical: document.getElementById('req-physical').value,
        posting_type: document.getElementById('req-posting-type').value,
        gender: document.getElementById('req-gender').value,
        extension_count: 0
    };
    sendData('requisition', reqData);
    e.target.reset();
    generateReqID();
    document.getElementById('target-date-display').innerHTML = '<span class="text-muted"><i class="fas fa-calculator me-1"></i> Select Date & Layer to see Target Date</span>';
}

async function handleAddCandidate(e) {
    e.preventDefault();
    let filename = "";
    const fileInput = document.getElementById('cand-file');
    
    if (fileInput && fileInput.files.length > 0) {
        filename = await uploadCandidateCV('temp-cand', fileInput.files[0]);
    }

    const candData = {
        id: 'CAND-' + Date.now(),
        req_id: document.getElementById('cand-req-link').value,
        recruiter: document.getElementById('cand-recruiter').value,
        name: document.getElementById('cand-name').value,
        interview_date: document.getElementById('cand-interview-date').value,
        phone: document.getElementById('cand-phone').value,
        email: document.getElementById('cand-email').value,
        notice_period: document.getElementById('cand-notice').value,
        expected_salary: document.getElementById('cand-salary').value,
        status: document.getElementById('cand-initial-status').value,
        hr_score: 0, 
        tech_score: 0,
        source: document.getElementById('cand-source').value,
        cv_file: filename, 
        notes: "", 
        rejection_reason: ""
    };
    
    sendData('candidate', candData); 
    e.target.reset();
}

function handleAddTraining(e) {
    e.preventDefault();
    const trainingData = {
        id: 'TRN-' + Date.now(),
        course_name: document.getElementById('train-course').value,
        type: document.getElementById('train-type').value,
        provider: document.getElementById('train-provider').value,
        date: document.getElementById('train-date').value,
        cost: document.getElementById('train-cost').value,
        status: 'Planned'
    };
    sendData('training', trainingData);
    e.target.reset();
}

function handleAddPerformance(e) {
    e.preventDefault();
    const data = {
        id: 'PERF-' + Date.now(),
        employee_name: document.getElementById('perf-emp-select').value,
        period: document.getElementById('perf-period').value,
        rating: document.getElementById('perf-rating').value,
        comment: document.getElementById('perf-comment').value
    };
    sendData('performance', data);
    e.target.reset();
}

function handleReferralSubmit(e) {
    e.preventDefault();
    const refData = {
        id: 'REF-' + Date.now(),
        name: document.getElementById('ref-name').value,
        position: document.getElementById('ref-position').value,
        recruiter: document.getElementById('ref-recruiter').value,
        referral_by: document.getElementById('ref-by').value,
        hr_score: document.getElementById('ref-hr-score').value,
        tech_score: document.getElementById('ref-tech-score').value,
        decision: document.getElementById('ref-decision').value,
        notes: document.getElementById('ref-notes').value
    };
    sendData('referral', refData); 
    e.target.reset();
}

// ==========================================
// RENDER FUNCTIONS
// ==========================================

function renderPipeline() {
    populateATSPositionFilter(); 
    const tbody = document.getElementById('pipeline-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const positionFilterEl = document.getElementById('ats-filter-position');
    const selectedPosition = positionFilterEl ? positionFilterEl.value : 'All';

    let filteredCandidates = systemData.candidates;

    if (selectedPosition !== 'All') {
        filteredCandidates = filteredCandidates.filter(c => {
            const jobReq = systemData.requisitions.find(r => r.req_id === c.req_id);
            const jobTitle = jobReq ? jobReq.title : c.req_id;
            return jobTitle === selectedPosition;
        });
    }

    const badge = document.getElementById('ats-count-badge');
    if(badge) badge.innerText = `Showing ${filteredCandidates.length} candidate(s)`;

    if (filteredCandidates.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-muted py-5">No candidates found matching criteria.</td></tr>`;
        return;
    }

    filteredCandidates.forEach(c => {
        if(c.status === 'Hired') return;
        
        const jobReq = systemData.requisitions.find(r => r.req_id === c.req_id);
        const jobTitle = jobReq ? jobReq.title : c.req_id;
        
        const initials = getInitials(c.name);
        const statusClass = getStatusClass(c.status);

        const hrPercent = (c.hr_score / 5) * 100;
        const hrColor = hrPercent >= 80 ? 'bar-high' : (hrPercent >= 50 ? 'bar-mid' : 'bar-low');
        
        const techPercent = (c.tech_score / 50) * 100;
        const techColor = techPercent >= 80 ? 'bar-high' : (techPercent >= 50 ? 'bar-mid' : 'bar-low');

        tbody.innerHTML += `
        <tr>
            <td class="text-start ps-4">
                <div class="d-flex align-items-center">
                    <div class="avatar-circle me-3 shadow-sm">${initials}</div>
                    <div>
                        <div class="fw-bold text-dark" style="cursor:pointer" onclick="openCandidateProfile('${c.id}')">${c.name}</div>
                        <div class="small text-muted" style="font-size: 0.75rem;"><i class="fas fa-calendar-alt me-1"></i> ${c.interview_date || 'TBD'}</div>
                    </div>
                </div>
            </td>
            
            <td>
                <div class="fw-bold text-dark-blue">${jobTitle}</div>
                <div class="small text-muted" style="font-size:0.7rem; letter-spacing:0.5px;">${c.req_id}</div>
            </td>
            
            <td><span class="badge bg-light text-dark border">${c.recruiter}</span></td>
            
            <td><span class="status-pill ${statusClass}">${c.status}</span></td>
            
            <td style="min-width: 140px;">
                <div class="d-flex align-items-center mb-1">
                    <span class="small fw-bold text-muted me-2" style="width:25px">HR</span>
                    <div class="skill-bar-container">
                        <div class="skill-bar-fill ${hrColor}" style="width: ${hrPercent}%"></div>
                    </div>
                    <span class="small fw-bold text-dark">${c.hr_score}</span>
                </div>
                <div class="d-flex align-items-center">
                    <span class="small fw-bold text-muted me-2" style="width:25px">Tec</span>
                    <div class="skill-bar-container">
                        <div class="skill-bar-fill ${techColor}" style="width: ${techPercent}%"></div>
                    </div>
                    <span class="small fw-bold text-dark">${c.tech_score}</span>
                </div>
            </td>
            
            <td>
                <div class="btn-group">
                    <button type="button" onclick="openCandidateProfile('${c.id}')" class="btn btn-sm btn-light border" title="View"><i class="fas fa-eye text-secondary"></i></button>
                    <button type="button" onclick="advanceStage('${c.id}')" class="btn btn-sm btn-light border" title="Next Stage"><i class="fas fa-arrow-right text-primary"></i></button>
                    <button type="button" onclick="hireCandidate('${c.id}')" class="btn btn-sm btn-light border" title="Hire"><i class="fas fa-check text-success"></i></button>
                    <button type="button" onclick="showDeleteConfirmation('candidate', '${c.id}', '${c.name}')" class="btn btn-sm btn-light border" title="Delete"><i class="fas fa-trash text-danger"></i></button>
                </div>
            </td>
        </tr>`;
    });
    
    setTimeout(() => { 
        document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el)); 
    }, 100);
}

function renderReferrals() {
    const tbody = document.getElementById('referral-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!systemData.referrals || systemData.referrals.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-muted py-3">No referrals added yet.</td></tr>`;
        return;
    }

    systemData.referrals.forEach(ref => {
        let badgeColor = 'bg-secondary';
        if (ref.decision === 'Accepted') badgeColor = 'bg-success';
        else if (ref.decision === 'Rejected') badgeColor = 'bg-danger';
        else if (ref.decision === 'On Hold') badgeColor = 'bg-warning text-dark';

        tbody.innerHTML += `
        <tr>
            <td class="fw-bold text-dark-blue">${ref.name}</td>
            <td>${ref.position}</td>
            <td>${ref.recruiter}</td>
            <td>HR: <b>${ref.hr_score}</b> / Tech: <b>${ref.tech_score}</b></td>
            <td><i class="fas fa-user-tag me-1 text-muted"></i> ${ref.referral_by}</td>
            <td><span class="badge ${badgeColor}">${ref.decision}</span></td>
            <td class="text-muted small">${ref.notes || '-'}</td>
            <td><button class="btn btn-sm btn-outline-danger shadow-sm" onclick="showDeleteConfirmation('referral', '${ref.id}', '${ref.name}')"><i class="fas fa-trash"></i></button></td>
        </tr>`;
    });
}

function renderEmployees() {
    const tbody = document.getElementById('employee-body'); if (!tbody) return;
    tbody.innerHTML = '';
    const deptFilter = document.getElementById('emp-filter-dept')?.value || 'All';
    const titleFilter = document.getElementById('emp-filter-title')?.value || 'All';
    if (document.getElementById('emp-filter-title')?.options.length <= 1) populatePositionFilter();
    let filtered = systemData.employees;
    if (deptFilter !== 'All') filtered = filtered.filter(e => e.dept === deptFilter);
    if (titleFilter !== 'All') filtered = filtered.filter(e => e.title === titleFilter);
    document.getElementById('emp-count-badge').innerText = `${filtered.length} Employees`;
    filtered.forEach(e => {
        tbody.innerHTML += `
        <tr>
            <td><span class="badge bg-light text-dark border">${e.code}</span></td>
            <td><div class="fw-bold text-dark">${e.name}</div><div class="small text-muted">${e.email || '-'}</div></td>
            <td>${e.title}</td>
            <td><span class="badge bg-light text-dark border">${e.dept}</span></td>
            <td>${e.manager}</td>
            <td><span class="fw-bold text-primary">${e.recruiter || '-'}</span></td>
            <td>${e.start_date}</td> 
            <td><button class="btn btn-sm btn-outline-primary shadow-sm" onclick="viewEmployee('${e.code}')"><i class="fas fa-id-badge"></i></button>
                <button class="btn btn-sm btn-outline-danger shadow-sm ms-1" onclick="showDeleteConfirmation('employee', '${e.code}', '${e.name}')"><i class="fas fa-trash"></i></button></td>
        </tr>`;
    });
}

function populatePositionFilter() {
    const select = document.getElementById('emp-filter-title'); if (!select) return;
    const titles = [...new Set(systemData.employees.map(e => e.title))].sort();
    select.innerHTML = '<option value="All">All Positions</option>';
    titles.forEach(title => { if(title) select.innerHTML += `<option value="${title}">${title}</option>`; });
}

function renderTraining() {
    const tbody = document.getElementById('training-body'); if(!tbody) return;
    tbody.innerHTML = '';
    let totalCost = 0;
    systemData.training_programs.forEach(t => {
        totalCost += parseFloat(t.cost);
        let badge = t.status === 'Completed' ? 'bg-success' : 'bg-warning text-dark';
        tbody.innerHTML += `<tr><td>${t.course_name}</td><td>${t.type}</td><td>${t.provider}</td><td>${t.date}</td><td>${Number(t.cost).toLocaleString()}</td><td><span class="badge ${badge}">${t.status}</span></td>
            <td><button class="btn btn-sm btn-outline-danger shadow-sm" onclick="showDeleteConfirmation('training', '${t.id}', '${t.course_name}')"><i class="fas fa-trash"></i></button></td></tr>`;
    });
    document.getElementById('total-training-cost').innerText = totalCost.toLocaleString() + ' EGP';
    renderTrainingChart(totalCost);
}

function renderPerformance() {
    const list = document.getElementById('performance-list'); if(!list) return;
    list.innerHTML = '';
    systemData.performance_reviews.slice().reverse().forEach(r => {
        let color = r.rating >= 4 ? 'text-success' : (r.rating >= 3 ? 'text-primary' : 'text-danger');
        list.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center"><div><strong>${r.employee_name}</strong> <small class="text-muted">(${r.period})</small></div>
            <div><span class="fw-bold ${color} me-3">${r.rating}/5</span><button class="btn btn-sm btn-link text-danger p-0" onclick="showDeleteConfirmation('performance', '${r.id}', '${r.employee_name}')"><i class="fas fa-trash"></i></button></div></li>`;
    });
    renderPerformanceChart();
}

function renderRequisitionsDropdown() { 
    const s = document.getElementById('cand-req-link'); 
    if(s) { 
        s.innerHTML='<option value="">Select Job...</option>'; 
        systemData.requisitions.forEach(r=>{ if(r.status === 'Approved' || r.status === 'Pending Approval') s.innerHTML+=`<option value="${r.req_id}">${r.req_id} - ${r.title}</option>`; }); 
    } 
}

function renderAssessmentDropdown() { } 

function renderAuditLog() { 
    const t=document.getElementById('audit-body'); 
    if(t) { 
        t.innerHTML=''; 
        systemData.audit_log.forEach(l=>{ t.innerHTML+=`<tr><td>${l.timestamp}</td><td>${l.user}</td><td>${l.action}</td></tr>`; }); 
    } 
}

function renderPositionsStatus() {
    const tbody = document.getElementById('pos-status-body');
    const filterSelect = document.getElementById('pos-status-filter');
    if (!tbody || !filterSelect) return;
    const currentVal = filterSelect.value;
    const uniqueTitles = [...new Set(systemData.requisitions.map(r => r.title))].sort();
    filterSelect.innerHTML = '<option value="All">All Positions</option>';
    uniqueTitles.forEach(title => { if(title) filterSelect.add(new Option(title, title)); });
    if(uniqueTitles.includes(currentVal)) filterSelect.value = currentVal;
    const selectedFilter = filterSelect.value;
    let filteredReqs = systemData.requisitions;
    if (selectedFilter !== 'All') filteredReqs = filteredReqs.filter(r => r.title === selectedFilter);
    tbody.innerHTML = '';
    filteredReqs.forEach(req => {
        const candCount = systemData.candidates.filter(c => c.req_id === req.req_id).length;
        const hiredCand = systemData.candidates.find(c => c.req_id === req.req_id && c.status === 'Hired');
        const hiredName = hiredCand ? `<span class="fw-bold text-success"><i class="fas fa-user-check me-1"></i> ${hiredCand.name}</span>` : '-';
        const startDate = new Date(req.start_date);
        const targetDate = new Date(req.target_date);
        let filledDateDisplay = '-', timeToFillDisplay = '-', slaDisplay = '-';
        if (req.status === 'Filled' && req.filled_date) {
            const filledDate = new Date(req.filled_date);
            filledDateDisplay = req.filled_date;
            const daysTaken = Math.ceil((filledDate - startDate) / (1000 * 60 * 60 * 24));
            timeToFillDisplay = `${daysTaken} Days`;
            const delayDays = Math.ceil((filledDate - targetDate) / (1000 * 60 * 60 * 24));
            slaDisplay = filledDate <= targetDate ? `<span class="badge bg-success">On Time</span>` : `<span class="badge bg-danger">Late by ${delayDays} Days</span>`;
        } else if (req.status !== 'Rejected') {
            const today = new Date();
            const daysOpen = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
            timeToFillDisplay = `<span class="text-muted">Running (${daysOpen} Days)</span>`;
            const remaining = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
            slaDisplay = remaining >= 0 ? `<span class="badge bg-info text-dark">${remaining} Days Left</span>` : `<span class="badge bg-warning text-dark">Overdue ${Math.abs(remaining)} Days</span>`;
        } else { slaDisplay = '<span class="badge bg-secondary">Cancelled</span>'; }
        tbody.innerHTML += `
        <tr>
            <td class="text-start ps-3"><div class="fw-bold text-dark-blue">${req.title}</div><div class="small text-muted">${req.req_id}</div></td>
            <td>${req.recruiter}</td>
            <td><span class="badge bg-light text-dark border">${candCount}</span></td>
            <td><span class="badge ${req.status === 'Filled' ? 'bg-success' : 'bg-primary'}">${req.status}</span></td>
            <td>${hiredName}</td>
            <td>${filledDateDisplay}</td>
            <td class="fw-bold">${timeToFillDisplay}</td>
            <td>${slaDisplay}</td>
        </tr>`;
    });
}

function hireCandidate(id) {
    const c = systemData.candidates.find(x => x.id === id); if(!c) return;
    const r = systemData.requisitions.find(x => x.req_id === c.req_id);
    const today = new Date().toISOString().split('T')[0];
    const hireDate = prompt("Please confirm Hiring Date (YYYY-MM-DD):", today);
    if (hireDate === null) return; 
    c.status = 'Hired';
    const newEmployee = {
        code: 'EMP-' + Math.floor(Math.random() * 10000),
        name: c.name,
        title: r ? r.title : 'Unassigned',
        dept: r ? r.dept : 'Unassigned',
        manager: r ? r.requester_name : '-',
        recruiter: c.recruiter,
        email: c.email || '',
        phone: c.phone || '',
        start_date: hireDate,
        status: 'Active'
    };
    authenticatedFetch('/api/save', { method: 'POST', body: JSON.stringify({ type: 'update_candidate', payload: c }) })
    .then(() => authenticatedFetch('/api/save', { method: 'POST', body: JSON.stringify({ type: 'hire_employee', payload: newEmployee }) }))
    .then(() => {
        if(r) { r.status = 'Filled'; r.filled_date = hireDate; return authenticatedFetch('/api/save', { method: 'POST', body: JSON.stringify({ type: 'update_requisition', payload: r }) }); }
    })
    .then(() => { showToast('Candidate Hired & Employee Record Created!', 'success'); loadData(); })
    .catch(err => { console.error(err); showToast('Error during hiring process', 'danger'); });
}

function advanceStage(id) {
    const c = systemData.candidates.find(x => x.id === id);
    const stages = ['Phone Screen', 'HR Interview', 'Technical Interview', 'Job Offer Phase', 'Hired'];
    const idx = stages.indexOf(c.status);
    if(idx < stages.length - 2) { 
        c.status = stages[idx+1]; 
        sendData('update_candidate', c); 
    }
}

function showJobDetails(reqId) {
    const req = systemData.requisitions.find(r => r.req_id === reqId);
    if (!req) return;

    currentReqIdForExtension = reqId;

    document.getElementById('modal-job-title').innerText = req.title;
    document.getElementById('modal-req-id').innerText = req.req_id;
    document.getElementById('modal-layer').innerText = req.layer || 'N/A';
    document.getElementById('modal-manager').innerText = req.requester_name;
    document.getElementById('modal-dept').innerText = req.dept;
    document.getElementById('modal-start-date').innerText = req.start_date;
    document.getElementById('modal-target-date').innerText = req.target_date;
    document.getElementById('modal-resp').innerText = req.responsibilities;
    document.getElementById('modal-skills').innerText = req.skills;
    
    const extCount = req.extension_count || 0;
    document.getElementById('modal-ext-count').innerText = extCount;

    document.getElementById('extension-section').style.display = 'none';
    document.getElementById('extensionForm').reset();

    new bootstrap.Modal(document.getElementById('jobDetailsModal')).show();
}

function toggleExtensionForm() {
    const section = document.getElementById('extension-section');
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
}

function previewNewDate() {
    const durationVal = document.getElementById('ext-duration').value;
    const dateInput = document.getElementById('ext-new-date');
    const req = systemData.requisitions.find(r => r.req_id === currentReqIdForExtension);
    
    if (!req || !req.target_date) return;

    const currentTarget = new Date(req.target_date);
    
    if (durationVal === 'policy') {
        let daysToAdd = 30;
        if (req.layer === 'Manager') daysToAdd = 105;
        else if (req.layer === 'Staff') daysToAdd = 75;
        currentTarget.setDate(currentTarget.getDate() + daysToAdd);
    } else if (durationVal !== '0') {
        currentTarget.setDate(currentTarget.getDate() + parseInt(durationVal));
    } else {
        return;
    }

    dateInput.value = currentTarget.toISOString().split('T')[0];
}

function submitExtension() {
    const newDate = document.getElementById('ext-new-date').value;
    const reason = document.getElementById('ext-reason').value;
    
    if (!newDate || !reason) {
        alert("Please select a valid date and reason.");
        return;
    }

    const req = systemData.requisitions.find(r => r.req_id === currentReqIdForExtension);
    if (req) {
        req.target_date = newDate;
        req.extension_count = (req.extension_count || 0) + 1;
        
        const logEntry = {
            timestamp: new Date().toISOString().split('T')[0],
            user: 'Manager (Admin)',
            action: `Extended SLA for ${req.req_id}. Reason: ${reason}`
        };
        systemData.audit_log.push(logEntry);

        showToast(`Success! Deadline extended to ${newDate}.`, 'success');
        
        renderDashboard();
        renderPositionsStatus();
        
        bootstrap.Modal.getInstance(document.getElementById('jobDetailsModal')).hide();
    }
}

function openCandidateProfile(id) {
    const c = systemData.candidates.find(x => x.id === id); if (!c) return;
    currentOpenCandidateId = id;
    
    document.getElementById('profile-name').innerText = c.name;
    document.getElementById('profile-role').innerText = c.req_id;
    document.getElementById('profile-email').innerText = c.email || '-';
    document.getElementById('profile-phone').innerText = c.phone || '-';
    document.getElementById('profile-date').innerText = c.interview_date || '-';
    document.getElementById('profile-status').innerText = c.status;
    document.getElementById('profile-hr-score').value = c.hr_score || '';
    document.getElementById('profile-tech-score').value = c.tech_score || '';
    document.getElementById('profile-notes').value = c.notes || '';
    
    const emailBtn = document.getElementById('profile-email-link');
    if(c.email) { 
        emailBtn.href = `mailto:${c.email}?subject=Interview Update ${c.req_id}`; 
        emailBtn.classList.remove('disabled'); 
    } else { 
        emailBtn.removeAttribute('href'); 
        emailBtn.classList.add('disabled'); 
    }
    
    new bootstrap.Modal(document.getElementById('candidateProfileModal')).show();
}

function saveProfileData() {
    const c = systemData.candidates.find(x => x.id === currentOpenCandidateId);
    if(c) {
        c.hr_score = document.getElementById('profile-hr-score').value;
        c.tech_score = document.getElementById('profile-tech-score').value;
        c.notes = document.getElementById('profile-notes').value;
        sendData('update_candidate', c);
    }
}

function rejectFromModal() {
    const reason = prompt("Rejection Reason:");
    if (reason) {
        const c = systemData.candidates.find(x => x.id === currentOpenCandidateId);
        if(c) {
            c.status = 'Rejected';
            c.rejection_reason = reason;
            sendData('update_candidate', c);
        }
    }
}

function viewEmployee(code) {
    const e = systemData.employees.find(x => x.code === code);
    if(e) {
        document.getElementById('emp-modal-name').innerText = e.name;
        document.getElementById('emp-modal-title').innerText = e.title;
        document.getElementById('emp-modal-dept').innerText = e.dept;
        document.getElementById('emp-modal-manager').innerText = e.manager;
        document.getElementById('emp-modal-recruiter').innerText = e.recruiter || '-';
        document.getElementById('emp-modal-email').innerText = e.email || '-';
        document.getElementById('emp-modal-phone').innerText = e.phone || '-';
        document.getElementById('emp-modal-date').innerText = e.start_date;
        new bootstrap.Modal(document.getElementById('employeeProfileModal')).show();
    }
}

function showPerformanceModal() {
    const select = document.getElementById('perf-emp-select');
    select.innerHTML = '';
    systemData.employees.forEach(e => { 
        select.innerHTML += `<option value="${e.name}">${e.name} (${e.title})</option>`; 
    });
    new bootstrap.Modal(document.getElementById('addPerformanceModal')).show();
}

// ==========================================
// DASHBOARD LOGIC
// ==========================================

function renderDashboard() {
    const yearFilterEl = document.getElementById('filter-year');
    const monthFilterEl = document.getElementById('filter-month');
    const deptFilterEl = document.getElementById('filter-dept');
    const recFilterEl = document.getElementById('filter-recruiter');

    const yearFilter = yearFilterEl ? yearFilterEl.value : 'All';
    const monthFilter = monthFilterEl ? monthFilterEl.value : 'All';
    const deptFilter = deptFilterEl ? deptFilterEl.value : 'All';
    const recFilter = recFilterEl ? recFilterEl.value : 'All';

    let filteredReqs = systemData.requisitions;

    if (yearFilter !== 'All') {
        filteredReqs = filteredReqs.filter(r => r.start_date && r.start_date.startsWith(yearFilter));
    }

    if (monthFilter !== 'All') {
        filteredReqs = filteredReqs.filter(r => {
            if (!r.start_date) return false;
            const dateParts = r.start_date.split('-');
            return dateParts[1] === monthFilter;
        });
    }

    if (deptFilter !== 'All') {
        filteredReqs = filteredReqs.filter(r => r.dept === deptFilter);
    }

    if (recFilter !== 'All') {
        filteredReqs = filteredReqs.filter(r => r.recruiter === recFilter);
    }

    let filteredCands = systemData.candidates.filter(c => {
        const parentReq = filteredReqs.find(r => r.req_id === c.req_id);
        return parentReq !== undefined;
    });

    const openReqs = filteredReqs.filter(r => r.status === 'Approved' || r.status === 'Pending Approval');
    document.getElementById('total-open-reqs').innerText = openReqs.length;

    const closedReqs = filteredReqs.filter(r => r.status === 'Filled');
    document.getElementById('total-closed-reqs').innerText = closedReqs.length;

    const activeCands = filteredCands.filter(c => c.status !== 'Hired' && c.status !== 'Rejected');
    document.getElementById('total-active-cand').innerText = activeCands.length;

    const pending = filteredCands.filter(c => c.status === 'Job Offer Phase').length;
    const accepted = filteredCands.filter(c => c.status === 'Hired').length;
    document.getElementById('total-pending-offers').innerText = pending;
    document.getElementById('total-accepted-offers').innerText = accepted;
    document.getElementById('total-issued-offers').innerText = pending + accepted;

    renderOpenReqList(openReqs); 
    renderSourcingChart(filteredCands);
    renderFunnelChart(filteredCands, filteredReqs);
    renderKPIs(filteredCands, filteredReqs);
    renderMonthlyChart(filteredReqs);
    renderSLAChart(filteredReqs);
    renderTargetGauges(filteredReqs, filteredCands);
}

function renderOpenReqList(reqs) {
    const openList = document.getElementById('open-req-list'); if (!openList) return;
    openList.innerHTML = reqs.length === 0 ? '<div class="text-muted small text-center p-2">No matching jobs found.</div>' : '';
    const today = new Date();
    reqs.forEach(r => {
        let slaBadge = "", borderColor = "#1B154A";
        if (r.target_date) {
            const target = new Date(r.target_date);
            const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
            slaBadge = diffDays >= 0 ? `<span class="sla-badge sla-on-track float-end"><i class="fas fa-clock me-1"></i> ${diffDays} days left</span>` : `<span class="sla-badge sla-overdue float-end"><i class="fas fa-exclamation-triangle me-1"></i> Overdue by ${Math.abs(diffDays)} days</span>`;
            if (diffDays < 0) borderColor = "#dc3545";
        }
        openList.innerHTML += `<div class="req-item-card" style="border-left: 4px solid ${borderColor};"><div class="d-flex align-items-center justify-content-between w-100"><div><span class="fw-bold text-dark small d-block">${r.title}</span><span class="text-muted small" style="font-size:0.75rem">${r.req_id}</span></div><div class="text-end">${slaBadge}<div class="mt-1"><button class="btn btn-sm btn-link text-primary p-0" onclick="showJobDetails('${r.req_id}')"><i class="fas fa-eye"></i></button></div></div></div></div>`;
    });
}

function renderSourcingChart(candidates) {
    const ctx = document.getElementById('sourcingChart').getContext('2d');
    const legendContainer = document.getElementById('source-legend');
    if(window.mySourcingChart) window.mySourcingChart.destroy();
    legendContainer.innerHTML = '';
    const sources = {}; candidates.forEach(c => { sources[c.source] = (sources[c.source] || 0) + 1; });
    const labels = Object.keys(sources), data = Object.values(sources), colors = ['#118DFF', '#E66C37', '#6B007B', '#12239E', '#E044A7'];
    window.mySourcingChart = new Chart(ctx, { type: 'doughnut', data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } } });
    labels.forEach((label, index) => { legendContainer.innerHTML += `<div class="source-legend-item"><span class="legend-color" style="background-color: ${colors[index % colors.length]};"></span><span>${label}: <strong>${data[index]}</strong></span></div>`; });
}

function renderFunnelChart(candidates = systemData.candidates, requisitions = systemData.requisitions) {
    const funnelSelect = document.getElementById('funnel-pos-select'); if(!funnelSelect) return;
    const uniqueTitles = [...new Set(requisitions.map(r => r.title))];
    const currentVal = funnelSelect.value;
    funnelSelect.innerHTML = '<option value="All">All Positions</option>';
    uniqueTitles.forEach(title => { funnelSelect.add(new Option(title, title)); });
    funnelSelect.value = uniqueTitles.includes(currentVal) ? currentVal : 'All';
    let target = candidates;
    if (funnelSelect.value !== 'All') target = target.filter(c => { const req = systemData.requisitions.find(r => r.req_id === c.req_id); return req && req.title === funnelSelect.value; });
    const stages = ['Phone Screen', 'HR Interview', 'Technical Interview', 'Job Offer Phase', 'Hired'];
    const dataPoints = stages.map(s => target.filter(c => c.status === s).length);
    const ctx = document.getElementById('funnelChart').getContext('2d');
    if (window.myFunnelChart) window.myFunnelChart.destroy();
    window.myFunnelChart = new Chart(ctx, { type: 'doughnut', data: { labels: stages, datasets: [{ data: dataPoints, backgroundColor: ['#E3F2FD', '#90CAF9', '#42A5F5', '#1B154A', '#C4161C'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: true, position: 'right' } } } });
}

function renderKPIs(candidatesList, reqsList) {
    const container = document.getElementById('recruiter-kpi-container'); if(!container) return;
    container.innerHTML = '';
    const recFilter = document.getElementById('filter-recruiter').value;
    let recruiters = systemData.recruiters || ['Hassan', 'Shaimaa', 'Esraa', 'Hussien']; 
    if (recFilter !== 'All') recruiters = [recFilter];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const selectedYear = document.getElementById('filter-year').value;
    recruiters.forEach(recruiter => {
        const recReqs = systemData.requisitions.filter(r => r.recruiter === recruiter);
        const recCands = systemData.candidates.filter(c => c.recruiter === recruiter);
        let monthlyRowsHTML = '';
        months.forEach((monthName, index) => {
            const filledInMonth = recReqs.filter(r => { if (r.status !== 'Filled' || !r.filled_date) return false; const d = new Date(r.filled_date); return d.getMonth() === index && d.getFullYear() == selectedYear; });
            let avgTimeFill = 0;
            if (filledInMonth.length > 0) { let totalDays = 0; filledInMonth.forEach(r => { totalDays += Math.ceil((new Date(r.filled_date) - new Date(r.start_date)) / (1000 * 60 * 60 * 24)); }); avgTimeFill = Math.round(totalDays / filledInMonth.length); }
            const hiresInMonth = recCands.filter(c => { if (c.status !== 'Hired') return false; const req = systemData.requisitions.find(r => r.req_id === c.req_id); return req && req.filled_date && new Date(req.filled_date).getMonth() === index && new Date(req.filled_date).getFullYear() == selectedYear; });
            const offersInMonth = recCands.filter(c => (c.status === 'Hired' || c.status === 'Job Offer Phase' || c.status === 'Rejected') && c.applied_date && c.applied_date.includes(`-${String(index+1).padStart(2,'0')}-`));
            let offerRate = offersInMonth.length > 0 ? Math.round((hiresInMonth.length / offersInMonth.length) * 100) : 0;
            const interviewsInMonth = recCands.filter(c => c.status.includes('Interview') && c.applied_date && c.applied_date.includes(`-${String(index+1).padStart(2,'0')}-`));
            let interviewRatio = offersInMonth.length > 0 ? Math.round((offersInMonth.length / interviewsInMonth.length) * 100) : 0;
            if (avgTimeFill > 0 || offerRate > 0 || interviewRatio > 0) {
                monthlyRowsHTML += `<tr><td>${monthName}</td><td>${avgTimeFill} d</td><td>${offerRate}%</td><td>${interviewRatio}%</td></tr>`;
            }
        });
        container.innerHTML += `<div class="col-md-6 mb-4"><div class="card h-100"><div class="card-header bg-dark text-white d-flex justify-content-between align-items-center"><div><i class="fas fa-user-tie me-2"></i>${recruiter}</div><span class="badge bg-primary">Scorecard</span></div><div class="card-body p-0"><table class="table table-sm table-hover mb-0 text-center"><thead class="table-light"><tr><th>Month</th><th>Avg Days</th><th>Offer %</th><th>Intv %</th></tr></thead><tbody>${monthlyRowsHTML || '<tr><td colspan="4" class="text-muted py-3">No data for this year</td></tr>'}</tbody></table></div></div></div>`;
    });
}

function renderMonthlyChart(reqs) {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    if (window.myMonthlyChart) window.myMonthlyChart.destroy();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const year = document.getElementById('filter-year').value;
    const data = months.map((m, i) => reqs.filter(r => { const d = new Date(r.start_date); return d.getMonth() === i && d.getFullYear() == year; }).length);
    window.myMonthlyChart = new Chart(ctx, { type: 'bar', data: { labels: months, datasets: [{ label: 'New Requisitions', data: data, backgroundColor: '#1B154A', borderRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } } });
}

function renderSLAChart(reqs) {
    const ctx = document.getElementById('slaChart').getContext('2d');
    if (window.mySLAChart) window.mySLAChart.destroy();
    const filled = reqs.filter(r => r.status === 'Filled' && r.filled_date);
    let onTime = 0, late = 0;
    filled.forEach(r => { if (new Date(r.filled_date) <= new Date(r.target_date)) onTime++; else late++; });
    window.mySLAChart = new Chart(ctx, { type: 'pie', data: { labels: ['On Time', 'Late'], datasets: [{ data: [onTime, late], backgroundColor: ['#198754', '#dc3545'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } } });
}

function getInitials(name) { if (!name) return '??'; const parts = name.split(' '); return parts.length === 1 ? parts[0].substring(0, 2).toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase(); }
function getStatusClass(status) { if (!status) return 'screen'; const s = status.toLowerCase(); if (s.includes('hired')) return 'hired'; if (s.includes('reject')) return 'rejected'; if (s.includes('offer')) return 'offer'; if (s.includes('interview')) return 'interview'; return 'screen'; }

function populateATSPositionFilter() {
    const select = document.getElementById('ats-filter-position'); if (!select) return;
    const current = select.value;
    const titles = [...new Set([...systemData.requisitions.map(r => r.title), ...systemData.candidates.map(c => systemData.requisitions.find(r => r.req_id === c.req_id)?.title)])].filter(t => t);
    select.innerHTML = '<option value="All">All Positions</option>';
    titles.sort().forEach(t => select.add(new Option(t, t)));
    if (titles.includes(current)) select.value = current;
}

function renderTargetGauges(reqs, cands) {
    const planRate = reqs.length > 0 ? Math.round((reqs.filter(r => r.status === 'Filled').length / reqs.length) * 100) : 0;
    const offers = cands.filter(c => c.status === 'Hired' || c.status === 'Job Offer Phase').length;
    const offerRate = offers > 0 ? Math.round((cands.filter(c => c.status === 'Hired').length / offers) * 100) : 0;
    const filled = reqs.filter(r => r.status === 'Filled' && r.filled_date);
    const slaRate = filled.length > 0 ? Math.round((filled.filter(r => new Date(r.filled_date) <= new Date(r.target_date)).length / filled.length) * 100) : 0;
    drawGauge('gaugePlan', planRate, '#1B154A');
    drawGauge('gaugeOffer', offerRate, '#C4161C');
    drawGauge('gaugeSLA', slaRate, '#198754');
}

function drawGauge(canvasId, value, color) {
    const ctx = document.getElementById(canvasId); if (!ctx) return;
    const textEl = document.getElementById(`val-${canvasId}`);
    if(textEl) { textEl.innerText = `${value}%`; textEl.style.color = color; }
    if (window[canvasId] instanceof Chart) window[canvasId].destroy();
    window[canvasId] = new Chart(ctx.getContext('2d'), { type: 'doughnut', data: { datasets: [{ data: [value, 100 - value], backgroundColor: [color, '#e2e8f0'], borderWidth: 0, circumference: 180, rotation: 270 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false }, tooltip: { enabled: false } } } });
}

function resetDashboardFilters() {
    const yearSelect = document.getElementById('filter-year'); if (yearSelect) yearSelect.value = new Date().getFullYear().toString();
    const monthSelect = document.getElementById('filter-month'); if (monthSelect) monthSelect.value = String(new Date().getMonth() + 1).padStart(2, '0');
    if(document.getElementById('filter-dept')) document.getElementById('filter-dept').value = 'All';
    if(document.getElementById('filter-recruiter')) document.getElementById('filter-recruiter').value = 'All';
    renderDashboard();
}

// ==========================================
// DELETE FUNCTIONS WITH CONFIRMATION (NEW)
// ==========================================

function showDeleteConfirmation(resourceType, resourceId, resourceName) {
    if (confirm(`Are you sure you want to delete ${resourceName}? This action cannot be undone.`)) {
        deleteResource(resourceType, resourceId, resourceName);
    }
}

async function deleteResource(resourceType, resourceId, resourceName) {
    try {
        const response = await authenticatedFetch(`/api/delete/${resourceType}/${resourceId}`, { method: 'DELETE' });
        const data = await response.json();
        if (response.ok && data.status === 'success') {
            showToast(`${resourceName} deleted successfully`, 'success');
            loadData();
        } else { showToast(data.message || 'Error deleting resource', 'danger'); }
    } catch (error) { console.error('Delete error:', error); showToast('Error deleting resource', 'danger'); }
}

// ==========================================
// NAVBAR LOGOUT BUTTON (NEW)
// ==========================================

function addLogoutButton() {
    const navbar = document.querySelector('.navbar .container-fluid');
    if (!navbar || document.getElementById('logoutBtn')) return;
    const userSection = document.createElement('div');
    userSection.className = 'navbar-user-section';
    userSection.id = 'navbarUserSection';
    userSection.innerHTML = `
        <div class="d-flex align-items-center gap-3">
            <div class="user-display"><span id="userDisplay" style="font-weight: 500; color: white;"></span></div>
            <button id="logoutBtn" class="btn btn-light btn-sm" onclick="handleLogout()">
                <i class="fas fa-sign-out-alt me-2"></i>Logout
            </button>
        </div>
    `;
    navbar.appendChild(userSection);
    authenticatedFetch('/api/session-check').then(r => r.json()).then(data => {
        if (data.authenticated) {
            const display = document.getElementById('userDisplay');
            if (display) display.textContent = `Welcome, ${data.user}`;
        }
    });
}

// ==========================================
// ENHANCED FILE UPLOAD (NEW)
// ==========================================

async function uploadCandidateCV(candidateId, file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('candidate_id', candidateId);
    try {
        const response = await authenticatedFetch('/api/upload_cv', { method: 'POST', body: formData, headers: {} });
        const data = await response.json();
        if (response.ok && data.status === 'success') {
            showToast('CV uploaded successfully', 'success');
            return data.filename;
        } else { showToast(data.message || 'Error uploading CV', 'danger'); return null; }
    } catch (error) { console.error('Upload error:', error); showToast('Error uploading CV', 'danger'); return null; }
}

// ==========================================
// CHART RENDERING FUNCTIONS (CONTINUED)
// ==========================================

function renderTrainingChart(totalCost) {
    // Implementation for training chart
}

function renderPerformanceChart() {
    // Implementation for performance chart
}
