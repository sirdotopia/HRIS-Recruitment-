/**
 * ACROW HRIS & ATS MODULE - MAIN SCRIPT
 * Version: 4.0
 * Includes: Dashboard, SLA Logic, Email System, Radar KPIs, Referral Tab
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // -----------------------------------------------------------
    // 1. ضبط السنة الحالية تلقائياً
    // -----------------------------------------------------------
    const yearSelect = document.getElementById('filter-year');
    if(yearSelect) {
        const currentYear = new Date().getFullYear().toString();
        if (![...yearSelect.options].some(o => o.value === currentYear)) {
            const opt = new Option(currentYear, currentYear);
            yearSelect.add(opt, 1); 
        }
        yearSelect.value = currentYear; 
    }

    // -----------------------------------------------------------
    // 2. ضبط الشهر الحالي تلقائياً
    // -----------------------------------------------------------
    const monthSelect = document.getElementById('filter-month');
    if(monthSelect) {
        const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
        monthSelect.value = currentMonth;
    }

    // -----------------------------------------------------------
    // 3. تحميل البيانات
    // -----------------------------------------------------------
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

// ==========================================
// 1. SYSTEM DATA (EMPTY - NO DATA)
// ==========================================
let systemData = {
    requisitions: [], 
    candidates: [],
    employees: [],
    trainings: [],
    performance_reviews: [],
    audit_log: [] 
};

let currentOpenCandidateId = null;

// ==========================================
// 1. SLA & DATE CALCULATION LOGIC
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

    // Policy Logic
    if (layerInput === 'Manager') {
        daysToAdd = 105; // 3.5 Months
    } else if (layerInput === 'Staff') {
        daysToAdd = 75; // 2.5 Months
    } else if (layerInput === 'Blue Collar') {
        daysToAdd = 30; // 30 Days
    }

    targetDate.setDate(targetDate.getDate() + daysToAdd);
    const formattedTarget = targetDate.toISOString().split('T')[0];

    displayEl.innerHTML = `<span class="fw-bold text-success"><i class="fas fa-check-circle me-1"></i> Target Onboarding: ${formattedTarget} (${daysToAdd} Days SLA)</span>`;
}

// ==========================================
// 2. EMAIL TEMPLATE SYSTEM
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

    const replacements = {
        "{name}": c.name.split(' ')[0], 
        "{role}": c.req_id, 
        "{date}": c.interview_date || "[Date TBD]"
    };

    for (const [key, value] of Object.entries(replacements)) {
        subject = subject.replace(new RegExp(key, 'g'), value);
        body = body.replace(new RegExp(key, 'g'), value);
    }

    document.getElementById('email-subject-preview').value = subject;
    document.getElementById('email-body-preview').value = body;
}

function sendGeneratedEmail() {
    const c = systemData.candidates.find(x => x.id === currentOpenCandidateId);
    if (!c || !c.email) {
        alert("This candidate does not have an email address.");
        return;
    }
    const subject = encodeURIComponent(document.getElementById('email-subject-preview').value);
    const body = encodeURIComponent(document.getElementById('email-body-preview').value);
    window.location.href = `mailto:${c.email}?subject=${subject}&body=${body}`;
}

// ==========================================
// 3. API & DATA LOADING
// ==========================================
function loadData() {
    fetch('/api/data')
        .then(response => response.json())
        .then(data => {
            systemData = data;
            
            // Ensure arrays exist
            if(!systemData.training_programs) systemData.training_programs = [];
            if(!systemData.performance_reviews) systemData.performance_reviews = [];
            if(!systemData.referrals) systemData.referrals = []; 
            
            // Render All Views
            renderDashboard(); 
            renderRequisitionsDropdown();
            renderPipeline();
            renderAssessmentDropdown();
            renderEmployees();
            renderTraining();     
            renderPerformance();  
            renderAuditLog();
            renderReferrals(); // NEW: Render Referrals
            renderPositionsStatus();
        })
        .catch(error => console.error('Error loading data:', error));
}

function sendData(type, payload, user="Hassan") {
    fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, payload, user })
    })
    .then(response => response.json())
    .then(data => {
        if(data.status === 'success') {
            loadData(); 
            // Close modals
            ['addCandidateModal', 'candidateProfileModal', 'addTrainingModal', 'addPerformanceModal', 'emailTemplateModal'].forEach(id => {
                const el = document.getElementById(id);
                if (el) { 
                    const modal = bootstrap.Modal.getInstance(el); 
                    if (modal) modal.hide(); 
                }
            });
        } else {
            alert("Error: " + data.message);
        }
    })
    .catch(error => console.error('Error sending data:', error));
}

function downloadReport(type) {
    window.location.href = `/api/export/${type}`;
}

// ==========================================
// 4. FORM HANDLERS
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
        recruiter: document.getElementById('req-recruiter').value,
        gender: document.getElementById('req-gender').value 
        
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
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        try {
            const response = await fetch('/api/upload_cv', { method: 'POST', body: formData });
            const result = await response.json();
            if(result.status === 'success') filename = result.filename;
        } catch (error) { console.error('Upload Error:', error); }
    }

    const candData = {
        id: 'CAND-' + Math.floor(Math.random() * 10000),
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
    const data = {
        course_name: document.getElementById('train-name').value,
        provider: document.getElementById('train-provider').value,
        type: document.getElementById('train-type').value,
        date: document.getElementById('train-date').value,
        cost: document.getElementById('train-cost').value,
        status: document.getElementById('train-status').value
    };
    sendData('training', data);
    e.target.reset();
}

function handleAddPerformance(e) {
    e.preventDefault();
    const data = {
        employee_name: document.getElementById('perf-emp-select').value,
        period: document.getElementById('perf-period').value,
        rating: document.getElementById('perf-rating').value,
        comment: document.getElementById('perf-comment').value
    };
    sendData('performance', data);
    e.target.reset();
}

// NEW: Referral Handler
function handleReferralSubmit(e) {
    e.preventDefault();
    const refData = {
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
// 5. RENDERERS
// ==========================================

// ==========================================
// 5. RENDERERS
// ==========================================

// ==========================================
// 5. RENDERERS (UPDATED: ALIVE TABLE)
// ==========================================

function renderPipeline() {
    const tbody = document.getElementById('pipeline-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    // --- Filter Logic ---
    const positionFilterEl = document.getElementById('ats-filter-position');
    const selectedPosition = positionFilterEl ? positionFilterEl.value : 'All';

    // Populate dropdown if empty
    if (positionFilterEl && positionFilterEl.options.length <= 1) {
        populateATSPositionFilter();
    }

    let filteredCandidates = systemData.candidates;

    // Apply Filter
    if (selectedPosition !== 'All') {
        filteredCandidates = filteredCandidates.filter(c => {
            const jobReq = systemData.requisitions.find(r => r.req_id === c.req_id);
            const jobTitle = jobReq ? jobReq.title : c.req_id;
            return jobTitle === selectedPosition;
        });
    }

    // Update Badge
    const badge = document.getElementById('ats-count-badge');
    if(badge) badge.innerText = `Showing ${filteredCandidates.length} candidate(s)`;

    if (filteredCandidates.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-muted py-5">No candidates found matching criteria.</td></tr>`;
        return;
    }

    filteredCandidates.forEach(c => {
        if(c.status === 'Hired') return; // Optionally hide hired from active pipeline
        
        const jobReq = systemData.requisitions.find(r => r.req_id === c.req_id);
        const jobTitle = jobReq ? jobReq.title : c.req_id;
        
        // --- 1. Avatar Generation ---
        const initials = getInitials(c.name);
        
        // --- 2. Status Pill Class ---
        const statusClass = getStatusClass(c.status);

        // --- 3. Score Bars Logic ---
        // HR Score (out of 5)
        const hrPercent = (c.hr_score / 5) * 100;
        const hrColor = hrPercent >= 80 ? 'bar-high' : (hrPercent >= 50 ? 'bar-mid' : 'bar-low');
        
        // Tech Score (out of 50)
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
                </div>
            </td>
        </tr>`;
    });
    
    // Re-initialize tooltips
    setTimeout(() => { 
        document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el)); 
    }, 100);
}

// --- NEW: Helper to fill the filter dropdown ---
function populateATSPositionFilter() {
    const select = document.getElementById('ats-filter-position');
    if (!select) return;

    // Get all unique job titles from Requisitions
    const titles = [...new Set(systemData.requisitions.map(r => r.title))].sort();
    
    // Reset and add options
    select.innerHTML = '<option value="All">All Positions</option>';
    titles.forEach(title => {
        if(title) select.innerHTML += `<option value="${title}">${title}</option>`;
    });
}

function renderReferrals() {
    const tbody = document.getElementById('referral-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!systemData.referrals || systemData.referrals.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-muted py-3">No referrals added yet.</td></tr>`;
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
        </tr>`;
    });
}

function renderEmployees() {
    const tbody = document.getElementById('employee-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const deptFilterEl = document.getElementById('emp-filter-dept');
    const titleFilterEl = document.getElementById('emp-filter-title');
    const selectedDept = deptFilterEl ? deptFilterEl.value : 'All';
    const selectedTitle = titleFilterEl ? titleFilterEl.value : 'All';

    if (titleFilterEl && titleFilterEl.options.length <= 1) populatePositionFilter();

    let filteredEmployees = systemData.employees;
    if (selectedDept !== 'All') filteredEmployees = filteredEmployees.filter(e => e.dept === selectedDept);
    if (selectedTitle !== 'All') filteredEmployees = filteredEmployees.filter(e => e.title === selectedTitle);

    document.getElementById('emp-count-badge').innerText = `${filteredEmployees.length} Employees`;

    if (filteredEmployees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-3">No employees found matching filters.</td></tr>`;
        return;
    }

    filteredEmployees.forEach(e => {
        tbody.innerHTML += `
        <tr>
            <td><span class="badge bg-light text-dark border">${e.code}</span></td>
            <td><div class="fw-bold text-dark">${e.name}</div><div class="small text-muted" style="font-size:0.75rem">${e.email || '-'}</div></td>
            <td>${e.title}</td>
            <td><span class="badge bg-light text-dark border">${e.dept}</span></td>
            <td>${e.manager}</td>
            <td><span class="fw-bold text-primary" style="font-size:0.8rem">${e.recruiter || '-'}</span></td>
            <td>${e.start_date}</td> 
            <td>
                <button class="btn btn-sm btn-outline-primary shadow-sm" onclick="viewEmployee('${e.code}')" title="View Profile"><i class="fas fa-id-badge"></i></button>
            </td>
        </tr>`;
    });
}

function populatePositionFilter() {
    const select = document.getElementById('emp-filter-title');
    if (!select) return;
    const titles = [...new Set(systemData.employees.map(e => e.title))].sort();
    select.innerHTML = '<option value="All">All Positions</option>';
    titles.forEach(title => { if(title) select.innerHTML += `<option value="${title}">${title}</option>`; });
}

function renderTraining() {
    const tbody = document.getElementById('training-body'); if(!tbody) return;
    tbody.innerHTML = '';
    let totalCost = 0;
    
    if(systemData.training_programs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-muted">No active training programs.</td></tr>';
    } else {
        systemData.training_programs.forEach(t => {
            totalCost += parseFloat(t.cost);
            let badge = t.status === 'Completed' ? 'bg-success' : 'bg-warning text-dark';
            tbody.innerHTML += `<tr><td>${t.course_name}</td><td>${t.type}</td><td>${t.provider}</td><td>${t.date}</td><td>${Number(t.cost).toLocaleString()}</td><td><span class="badge ${badge}">${t.status}</span></td></tr>`;
        });
    }
    document.getElementById('total-training-cost').innerText = totalCost.toLocaleString() + ' EGP';
    renderTrainingChart(totalCost);
}

function renderPerformance() {
    const list = document.getElementById('performance-list'); if(!list) return;
    list.innerHTML = '';
    
    if(systemData.performance_reviews.length === 0) {
        list.innerHTML = '<li class="list-group-item text-muted text-center py-3">No reviews added yet.</li>';
    } else {
        systemData.performance_reviews.slice().reverse().forEach(r => {
            let color = r.rating >= 4 ? 'text-success' : (r.rating >= 3 ? 'text-primary' : 'text-danger');
            list.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center"><div><strong>${r.employee_name}</strong> <small class="text-muted">(${r.period})</small></div><span class="fw-bold ${color}">${r.rating}/5</span></li>`;
        });
    }
    renderPerformanceChart();
}

function renderRequisitionsDropdown() { 
    const s = document.getElementById('cand-req-link'); 
    if(s) { 
        s.innerHTML='<option value="">Select Job...</option>'; 
        systemData.requisitions.forEach(r=>{ 
            if(r.status === 'Approved' || r.status === 'Pending Approval') {
                s.innerHTML+=`<option value="${r.req_id}">${r.req_id} - ${r.title}</option>`; 
            }
        }); 
    } 
}

function renderAssessmentDropdown() { } 

function renderAuditLog() { 
    const t=document.getElementById('audit-body'); 
    if(t) { 
        t.innerHTML=''; 
        systemData.audit_log.forEach(l=>{ 
            t.innerHTML+=`<tr><td>${l.timestamp}</td><td>${l.user}</td><td>${l.action}</td></tr>`; 
        }); 
    } 
}
// ==========================================
// NEW RENDERER: POSITIONS STATUS TAB
// ==========================================
function renderPositionsStatus() {
    const tbody = document.getElementById('pos-status-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Loop through all requisitions
    systemData.requisitions.forEach(req => {
        // 1. Count Candidates
        const candCount = systemData.candidates.filter(c => c.req_id === req.req_id).length;

        // 2. Find Hired Candidate (if any)
        const hiredCand = systemData.candidates.find(c => c.req_id === req.req_id && c.status === 'Hired');
        const hiredName = hiredCand ? `<span class="fw-bold text-success"><i class="fas fa-user-check me-1"></i> ${hiredCand.name}</span>` : '-';

        // 3. Dates Logic
        const startDate = new Date(req.start_date);
        const targetDate = new Date(req.target_date);
        let filledDateDisplay = '-';
        let timeToFillDisplay = '-';
        let slaDisplay = '-';

        // 4. Logic for FILLED Positions
        if (req.status === 'Filled' && req.filled_date) {
            const filledDate = new Date(req.filled_date);
            filledDateDisplay = req.filled_date;

            // Time to Fill (Days taken)
            const daysTaken = Math.ceil((filledDate - startDate) / (1000 * 60 * 60 * 24));
            timeToFillDisplay = `${daysTaken} Days`;

            // SLA Check (Actual Delay)
            const delayDays = Math.ceil((filledDate - targetDate) / (1000 * 60 * 60 * 24));
            
            if (filledDate <= targetDate) {
                slaDisplay = `<span class="badge bg-success">On Time</span>`;
            } else {
                slaDisplay = `<span class="badge bg-danger">Late by ${delayDays} Days</span>`;
            }
        } 
        // 5. Logic for OPEN Positions (Live Tracking)
        else if (req.status !== 'Rejected') {
            const today = new Date();
            const daysOpen = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
            timeToFillDisplay = `<span class="text-muted">Running (${daysOpen} Days)</span>`;

            // SLA Check (Projected Delay)
            const remaining = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
            if (remaining >= 0) {
                slaDisplay = `<span class="badge bg-info text-dark">${remaining} Days Left</span>`;
            } else {
                slaDisplay = `<span class="badge bg-warning text-dark">Overdue ${Math.abs(remaining)} Days</span>`;
            }
        } else {
            // Cancelled/Rejected Reqs
            slaDisplay = '<span class="badge bg-secondary">Cancelled</span>';
        }

        // 6. Build the Row
        tbody.innerHTML += `
        <tr>
            <td class="text-start ps-3">
                <div class="fw-bold text-dark-blue">${req.title}</div>
                <div class="small text-muted">${req.req_id}</div>
            </td>
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

// ==========================================
// 6. ACTION FUNCTIONS
// ==========================================

// ==========================================
// FIX: HIRE CANDIDATE ACTION
// ==========================================
// ==========================================
// THE LINKING LOGIC (ATS -> MASTER DATA -> DASHBOARD)
// ==========================================
function hireCandidate(id) {
    // 1. جلب بيانات المرشح والوظيفة
    const c = systemData.candidates.find(x => x.id === id);
    if(!c) return;
    const r = systemData.requisitions.find(x => x.req_id === c.req_id);

    // 2. تأكيد تاريخ التعيين
    const today = new Date().toISOString().split('T')[0];
    const hireDate = prompt("Please confirm Hiring Date (YYYY-MM-DD):", today);
    if (hireDate === null) return; 

    // 3. تغيير حالة المرشح محلياً
    c.status = 'Hired';
    
    // 4. تجهيز بيانات الموظف الجديد (Mapping)
    const newEmployee = {
        code: 'EMP-' + Math.floor(Math.random() * 10000), // كود موظف عشوائي
        name: c.name,
        title: r ? r.title : 'Unassigned',  // يأخذ المسمى من الوظيفة
        dept: r ? r.dept : 'Unassigned',    // يأخذ القسم من الوظيفة
        manager: r ? r.requester_name : '-', // يأخذ المدير من الوظيفة
        recruiter: c.recruiter,
        email: c.email || '',
        phone: c.phone || '',
        start_date: hireDate,
        status: 'Active'
    };

    // 5. تنفيذ سلسلة الحفظ (Chained Save)
    // أولاً: نحدث حالة المرشح
    fetch('/api/save', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ type: 'update_candidate', payload: c }) 
    })
    .then(() => {
        // ثانياً: نرسل الموظف الجديد للـ Master Data (هذا هو الرابط المفقود)
        return fetch('/api/save', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ type: 'hire_employee', payload: newEmployee }) 
        });
    })
    .then(() => {
        // ثالثاً: نغلق الوظيفة (تصبح Filled)
        if(r) {
            r.status = 'Filled';
            r.filled_date = hireDate;
            return fetch('/api/save', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ type: 'update_requisition', payload: r }) 
            });
        }
    })
    .then(() => {
        // رابعاً وأخيراً: تحديث الواجهة بالكامل
        loadData(); // ستقوم هذه الدالة بجلب البيانات الجديدة وتحديث الداشبورد والموظفين
        alert(`Process Complete:\n1. Candidate Hired\n2. Added to Master Data\n3. Job Closed\n4. Dashboard Updated`);
    })
    .catch(err => {
        console.error(err);
        alert("Error in linking process.");
    });
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
// ==========================================
// SLA EXTENSION LOGIC
// ==========================================
let currentReqIdForExtension = null;

function showJobDetails(reqId) {
    const req = systemData.requisitions.find(r => r.req_id === reqId);
    if (!req) return;

    currentReqIdForExtension = reqId;

    // Populate Basic Info
    document.getElementById('modal-job-title').innerText = req.title;
    document.getElementById('modal-req-id').innerText = req.req_id;
    document.getElementById('modal-layer').innerText = req.layer || 'N/A';
    document.getElementById('modal-manager').innerText = req.requester_name;
    document.getElementById('modal-dept').innerText = req.dept;
    document.getElementById('modal-start-date').innerText = req.start_date;
    document.getElementById('modal-target-date').innerText = req.target_date;
    document.getElementById('modal-resp').innerText = req.responsibilities;
    document.getElementById('modal-skills').innerText = req.skills;
    
    // Extension Count
    const extCount = req.extension_count || 0;
    document.getElementById('modal-ext-count').innerText = extCount;

    // Reset Form
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
        // Add full cycle based on layer
        let daysToAdd = 30; // Default
        if (req.layer === 'Manager') daysToAdd = 105;
        else if (req.layer === 'Staff') daysToAdd = 75;
        
        currentTarget.setDate(currentTarget.getDate() + daysToAdd);
    } else if (durationVal !== '0') {
        // Add fixed days (15 or 30)
        currentTarget.setDate(currentTarget.getDate() + parseInt(durationVal));
    } else {
        return; // Custom date, let user pick
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
        // 1. Update Data
        req.target_date = newDate;
        req.extension_count = (req.extension_count || 0) + 1;
        
        // 2. Log to Audit
        const logEntry = {
            timestamp: new Date().toISOString().split('T')[0],
            user: 'Manager (Admin)',
            action: `Extended SLA for ${req.req_id}. Reason: ${reason}`
        };
        systemData.audit_log.push(logEntry); // In real app, send to backend

        // 3. Save & Refresh
        // Mocking save: In real app use fetch('/api/save'...)
        alert(`Success! Deadline extended to ${newDate}.\nReason: ${reason}`);
        
        // Refresh Views
        renderDashboard();
        renderPositionsStatus(); // To update the SLA status table
        
        // Close Modal
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
// 7. DASHBOARD LOGIC
// ==========================================

function renderDashboard() {
    // 1. Get Filter Values
    const yearFilterEl = document.getElementById('filter-year');
    const monthFilterEl = document.getElementById('filter-month'); // New
    const deptFilterEl = document.getElementById('filter-dept');
    const recFilterEl = document.getElementById('filter-recruiter');

    const yearFilter = yearFilterEl ? yearFilterEl.value : 'All';
    const monthFilter = monthFilterEl ? monthFilterEl.value : 'All'; // New
    const deptFilter = deptFilterEl ? deptFilterEl.value : 'All';
    const recFilter = recFilterEl ? recFilterEl.value : 'All';

    // 2. Filter Requisitions (MASTER FILTER)
    let filteredReqs = systemData.requisitions;

    // >> A. Year Filter (Based on Start Date YYYY)
    if (yearFilter !== 'All') {
        filteredReqs = filteredReqs.filter(r => r.start_date && r.start_date.startsWith(yearFilter));
    }

    // >> B. Month Filter (Based on Start Date MM) -- NEW LOGIC
    if (monthFilter !== 'All') {
        filteredReqs = filteredReqs.filter(r => {
            if (!r.start_date) return false;
            const dateParts = r.start_date.split('-'); // YYYY-MM-DD
            return dateParts[1] === monthFilter;
        });
    }

    // >> C. Dept Filter
    if (deptFilter !== 'All') {
        filteredReqs = filteredReqs.filter(r => r.dept === deptFilter);
    }

    // >> D. Recruiter Filter
    if (recFilter !== 'All') {
        filteredReqs = filteredReqs.filter(r => r.recruiter === recFilter);
    }

    // 3. Filter Candidates (Dependent on Requisitions)
    // We only show candidates attached to the filtered requisitions
    let filteredCands = systemData.candidates.filter(c => {
        const parentReq = filteredReqs.find(r => r.req_id === c.req_id);
        return parentReq !== undefined;
    });

    // 4. Update KPI Cards (Hero Cards)
    const openReqs = filteredReqs.filter(r => r.status === 'Approved' || r.status === 'Pending Approval');
    document.getElementById('total-open-reqs').innerText = openReqs.length;

    const closedReqs = filteredReqs.filter(r => r.status === 'Filled');
    document.getElementById('total-closed-reqs').innerText = closedReqs.length;

    // Active Candidates in Pipeline (excluding Hired/Rejected)
    const activeCands = filteredCands.filter(c => c.status !== 'Hired' && c.status !== 'Rejected');
    document.getElementById('total-active-cand').innerText = activeCands.length;

    const pending = filteredCands.filter(c => c.status === 'Job Offer Phase').length;
    const accepted = filteredCands.filter(c => c.status === 'Hired').length;
    document.getElementById('total-pending-offers').innerText = pending;
    document.getElementById('total-accepted-offers').innerText = accepted;
    document.getElementById('total-issued-offers').innerText = pending + accepted;

    // 5. Update Lists & Charts
    renderOpenReqList(openReqs); 
    renderSourcingChart(filteredCands);
    renderFunnelChart(filteredCands, filteredReqs);
    renderKPIs(filteredCands, filteredReqs); // This will now show Monthly KPIs automatically!
    renderMonthlyChart(filteredReqs);
    renderSLAChart(filteredReqs);
    renderTargetGauges(filteredReqs, filteredCands);
}

// --- Helper for Open Req List (To keep main function clean) ---
function renderOpenReqList(reqs) {
    const openList = document.getElementById('open-req-list');
    if (!openList) return;
    
    openList.innerHTML = '';
    if (reqs.length === 0) {
        openList.innerHTML = '<div class="text-muted small text-center p-2">No matching jobs found.</div>';
        return;
    }

    const today = new Date();
    reqs.forEach(r => {
        let slaBadge = "";
        let borderColor = "#1B154A";
        
        if (r.target_date) {
            const target = new Date(r.target_date);
            const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
            
            if (diffDays >= 0) {
                slaBadge = `<span class="sla-badge sla-on-track float-end"><i class="fas fa-clock me-1"></i> ${diffDays} days left</span>`;
            } else {
                slaBadge = `<span class="sla-badge sla-overdue float-end"><i class="fas fa-exclamation-triangle me-1"></i> Overdue by ${Math.abs(diffDays)} days</span>`;
                borderColor = "#dc3545";
            }
        }

        openList.innerHTML += `
        <div class="req-item-card" style="border-left: 4px solid ${borderColor};">
            <div class="d-flex align-items-center justify-content-between w-100">
                <div style="flex-grow:1">
                    <span class="fw-bold text-dark small d-block">${r.title}</span>
                    <span class="text-muted small" style="font-size:0.75rem">${r.req_id}</span>
                </div>
                <div class="text-end">
                    ${slaBadge}
                    <div class="mt-1">
                        <button class="btn btn-sm btn-link text-primary p-0" onclick="showJobDetails('${r.req_id}')" title="View JD"><i class="fas fa-eye"></i></button>
                    </div>
                </div>
            </div>
        </div>`;
    });
}

// ==========================================
// 8. CHART FUNCTIONS (UPDATED KPIs & TOOLTIPS)
// ==========================================

function renderSourcingChart(candidates) {
    const ctx = document.getElementById('sourcingChart').getContext('2d');
    const legendContainer = document.getElementById('source-legend');
    if(window.mySourcingChart) window.mySourcingChart.destroy();
    
    legendContainer.innerHTML = '';
    const sources = {}; 
    candidates.forEach(c => { sources[c.source] = (sources[c.source] || 0) + 1; });
    
    const labels = Object.keys(sources); 
    const data = Object.values(sources);
    const colors = ['#118DFF', '#E66C37', '#6B007B', '#12239E', '#E044A7'];
    
    window.mySourcingChart = new Chart(ctx, { 
        type: 'doughnut', 
        data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderWidth: 0 }] }, 
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false }, tooltip: { enabled: true } } } 
    });
    
    labels.forEach((label, index) => { 
        legendContainer.innerHTML += `<div class="source-legend-item"><span class="legend-color" style="background-color: ${colors[index % colors.length]};"></span><span>${label}: <strong>${data[index]}</strong></span></div>`; 
    });
}

function renderFunnelChart(candidates = systemData.candidates, requisitions = systemData.requisitions) {
    const selectedPos = document.getElementById('funnel-pos-select').value;
    let targetCandidates = candidates;
    const funnelSelect = document.getElementById('funnel-pos-select');
    const uniqueTitles = [...new Set(requisitions.map(r => r.title))];
    const currentVal = funnelSelect.value;
    
    funnelSelect.innerHTML = '<option value="All">All Positions</option>';
    uniqueTitles.forEach(title => { 
        const option = document.createElement('option'); 
        option.value = title; 
        option.text = title; 
        funnelSelect.appendChild(option); 
    });
    
    if(uniqueTitles.includes(currentVal)) funnelSelect.value = currentVal; else funnelSelect.value = 'All';

    if (funnelSelect.value !== 'All') {
        targetCandidates = targetCandidates.filter(c => {
            const req = systemData.requisitions.find(r => r.req_id === c.req_id);
            return req && req.title === funnelSelect.value;
        });
    }

    const stages = ['Phone Screen', 'HR Interview', 'Technical Interview', 'Job Offer Phase', 'Hired'];
    const dataPoints = stages.map(s => targetCandidates.filter(c => c.status === s).length);
    const ctx = document.getElementById('funnelChart').getContext('2d');
    
    if (window.myFunnelChart) window.myFunnelChart.destroy();
    
    const stageColors = ['#E3F2FD', '#90CAF9', '#42A5F5', '#1B154A', '#C4161C'];
    window.myFunnelChart = new Chart(ctx, { 
        type: 'doughnut', 
        data: { labels: stages, datasets: [{ data: dataPoints, backgroundColor: stageColors, borderWidth: 0, hoverOffset: 4 }] }, 
        options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: true, position: 'right' } } } 
    });
}

function renderKPIs(candidatesList, reqsList) {
    const container = document.getElementById('recruiter-kpi-container'); 
    if(!container) return;
    
    container.innerHTML = '';
    
    const recFilter = document.getElementById('filter-recruiter').value;
    let recruitersToShow = systemData.recruiters;
    if (recFilter !== 'All') recruitersToShow = [recFilter];
    
    let chartsData = [];
    let htmlContent = '';

    recruitersToShow.forEach((recruiter, index) => {
        const myReqs = reqsList.filter(r => r.recruiter === recruiter);
        const myCands = candidatesList.filter(c => c.recruiter === recruiter);
        
        // Metrics
        const totalPlanned = myReqs.length; 
        const totalFilled = myReqs.filter(r => r.status === 'Filled').length;
        const hiringPlanRate = totalPlanned > 0 ? Math.round((totalFilled / totalPlanned) * 100) : 0;
        const hpColor = hiringPlanRate >= 90 ? 'text-success' : 'text-danger';

        const filledJobs = myReqs.filter(r => r.status === 'Filled' && r.filled_date && r.target_date);
        let onTimeJobs = 0;
        filledJobs.forEach(r => { if (new Date(r.filled_date) <= new Date(r.target_date)) onTimeJobs++; });
        const timeToFillRate = filledJobs.length > 0 ? Math.round((onTimeJobs / filledJobs.length) * 100) : 0;
        const ttfColor = timeToFillRate >= 85 ? 'text-success' : 'text-danger';

        const hiredCount = myCands.filter(c => c.status === 'Hired').length;
        const pendingOfferCount = myCands.filter(c => c.status === 'Job Offer Phase').length;
        const totalOffers = hiredCount + pendingOfferCount; 
        const offerRate = totalOffers > 0 ? Math.round((hiredCount / totalOffers) * 100) : 0;
        const offerColor = offerRate >= 90 ? 'text-success' : 'text-danger';

        const interviewStages = ['HR Interview', 'Technical Interview', 'Job Offer Phase', 'Hired'];
        const totalInterviews = myCands.filter(c => interviewStages.includes(c.status) || c.status === 'Rejected').length;
        const interviewRatio = totalInterviews > 0 ? Math.round((hiredCount / totalInterviews) * 100) : 0;
        const ivColor = interviewRatio >= 10 ? 'text-success' : 'text-danger';

        chartsData.push({
            id: `chart-rec-${index}`,
            label: recruiter,
            data: [hiringPlanRate, timeToFillRate, offerRate, interviewRatio]
        });

        htmlContent += `
        <div class="col-md-6 mb-4">
            <div class="card h-100 shadow-sm border-0">
                <div class="card-header bg-white border-bottom-0 pb-0 pt-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="fw-bold text-dark-blue mb-0"><i class="fas fa-user-tie me-2 bg-light p-2 rounded-circle"></i> ${recruiter}</h6>
                        <span class="badge bg-light text-muted border">Scorecard</span>
                    </div>
                </div>
                <div class="card-body pt-2">
                    <div class="row align-items-center">
                        <div class="col-md-7">
                            <div class="row g-2">
                                <div class="col-6"><div class="p-2 border rounded bg-light"><small class="text-muted d-block" style="font-size:0.65rem">Hiring Plan (90%)</small><span class="fw-bold ${hpColor}">${hiringPlanRate}%</span></div></div>
                                <div class="col-6"><div class="p-2 border rounded bg-light"><small class="text-muted d-block" style="font-size:0.65rem">Time to Fill (85%)</small><span class="fw-bold ${ttfColor}">${timeToFillRate}%</span></div></div>
                                <div class="col-6"><div class="p-2 border rounded bg-light"><small class="text-muted d-block" style="font-size:0.65rem">Offer Acc. (90%)</small><span class="fw-bold ${offerColor}">${offerRate}%</span></div></div>
                                <div class="col-6"><div class="p-2 border rounded bg-light"><small class="text-muted d-block" style="font-size:0.65rem">Interv. Ratio (10%)</small><span class="fw-bold ${ivColor}">${interviewRatio}%</span></div></div>
                            </div>
                        </div>
                        <div class="col-md-5">
                            <div style="height: 160px; width: 100%;">
                                <canvas id="chart-rec-${index}"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = htmlContent;

    chartsData.forEach(item => {
        const ctx = document.getElementById(item.id).getContext('2d');
        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Hiring Plan', 'Time Fill', 'Offers', 'Interviews'],
                datasets: [{
                    label: 'Actual %',
                    data: item.data,
                    backgroundColor: 'rgba(27, 21, 74, 0.2)', 
                    borderColor: '#1B154A',
                    pointBackgroundColor: '#C4161C', 
                    pointBorderColor: '#fff',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { display: true },
                        suggestedMin: 0,
                        suggestedMax: 100,
                        ticks: { display: false } 
                    }
                },
                plugins: { legend: { display: false } }
            }
        });
    });
    
    
}

function renderMonthlyChart(allReqs) {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    if(window.myMonthlyChart) window.myMonthlyChart.destroy();
    
    const filledReqs = allReqs.filter(r => r.status === 'Filled' && r.filled_date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const recruiters = [...new Set(allReqs.map(r => r.recruiter || 'Unassigned'))];
    
    const datasets = recruiters.map((rec, i) => {
        const dataCounts = new Array(12).fill(0);
        const jobTitlesData = new Array(12).fill(null).map(() => []); 

        filledReqs.filter(r => r.recruiter === rec).forEach(r => {
            const date = new Date(r.filled_date);
            if (!isNaN(date)) { 
                const monthIdx = date.getMonth(); 
                dataCounts[monthIdx]++; 
                jobTitlesData[monthIdx].push(r.title);
            }
        });

        const colors = ['#118DFF', '#E66C37', '#6B007B', '#12239E', '#E044A7', '#198754'];
        return { 
            label: rec, 
            data: dataCounts, 
            backgroundColor: colors[i % colors.length],
            extraData: jobTitlesData 
        };
    });
    
    window.myMonthlyChart = new Chart(ctx, { 
        type: 'bar', 
        data: { labels: months, datasets: datasets }, 
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const dataset = context.dataset;
                            const index = context.dataIndex;
                            const value = context.raw;
                            const titles = dataset.extraData[index];

                            if (value === 0) return null;
                            let labelArray = [`${dataset.label}: ${value} Hires`];
                            if (titles && titles.length > 0) {
                                titles.forEach(t => { labelArray.push(`• ${t}`); });
                            }
                            return labelArray;
                        }
                    }
                }
            },
            scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } } } 
        } 
    });
}

function renderTrainingChart(spent) {
    const ctx = document.getElementById('trainingBudgetChart').getContext('2d');
    if(window.myTrainingChart) window.myTrainingChart.destroy();
    const budget = 500000;
    const remaining = Math.max(0, budget - spent);
    window.myTrainingChart = new Chart(ctx, { type: 'doughnut', data: { labels: ['Spent', 'Remaining'], datasets: [{ data: [spent, remaining], backgroundColor: ['#C4161C', '#1B154A'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom' } } } });
}

function renderPerformanceChart() {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    if(window.myPerfChart) window.myPerfChart.destroy();
    let buckets = [0, 0, 0, 0];
    systemData.performance_reviews.forEach(r => {
        const rate = parseFloat(r.rating);
        if(rate < 2) buckets[0]++; else if(rate < 3) buckets[1]++; else if(rate < 4) buckets[2]++; else buckets[3]++;
    });
    window.myPerfChart = new Chart(ctx, { type: 'bar', data: { labels: ['Needs Imp', 'Developing', 'Proficient', 'Excellent'], datasets: [{ label: 'Employees', data: buckets, backgroundColor: ['#dc3545', '#ffc107', '#0d6efd', '#198754'], borderRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } } });
}
// ==========================================
// NEW SLA CHART (With Job Titles & Days Calculation)
// ==========================================
// ==========================================
// UPDATED SLA CHART (BAR CHART - CLEARER)
// ==========================================
// ==========================================
// ADVANCED SLA CHART (WITH AGING BUCKETS)
// ==========================================
function renderSLAChart(reqs) {
    const ctx = document.getElementById('slaChart').getContext('2d');
    if (window.mySLAChart) window.mySLAChart.destroy();

    // 1. Define Buckets
    let onTrackCount = 0;
    let atRiskCount = 0;      // < 10 days left
    let lateLowCount = 0;     // Late by 1-14 days
    let lateHighCount = 0;    // Late by 15+ days

    const today = new Date();

    reqs.forEach(r => {
        if (!r.target_date || !r.start_date || r.status === 'Rejected') return;

        const targetDate = new Date(r.target_date);
        let daysDiff = 0; // Negative means Late, Positive means Time Left

        // Logic for FILLED jobs (Freeze calculation at filled date)
        if (r.status === 'Filled' && r.filled_date) {
            const filledDate = new Date(r.filled_date);
            daysDiff = Math.ceil((targetDate - filledDate) / (1000 * 60 * 60 * 24));
        } 
        // Logic for OPEN jobs (Live calculation)
        else {
            daysDiff = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
        }

        // Categorize
        if (daysDiff < -14) {
            lateHighCount++; // Very Late (Red)
        } else if (daysDiff < 0) {
            lateLowCount++;  // Slightly Late (Orange)
        } else if (daysDiff <= 10) {
            atRiskCount++;   // Warning (Yellow)
        } else {
            onTrackCount++;  // Safe (Green)
        }
    });

    // 2. Draw Bar Chart
    window.mySLAChart = new Chart(ctx, {
        type: 'bar',
        data: {
            // New Labels
            labels: ['On Track', 'At Risk', 'Late (1-14 Days)', 'Late (15+ Days)'],
            datasets: [{
                label: 'Jobs Count',
                data: [onTrackCount, atRiskCount, lateLowCount, lateHighCount],
                backgroundColor: [
                    '#198754', // Green
                    '#ffc107', // Yellow
                    '#fd7e14', // Orange (New)
                    '#dc3545'  // Red
                ],
                borderRadius: 6,
                barThickness: 35,
                borderWidth: 1,
                borderColor: '#fff' // Clean separation
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1B154A',
                    callbacks: {
                        label: function(context) {
                            return ` ${context.raw} Positions`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f8fafc' },
                    ticks: { stepSize: 1 } // Show whole numbers only
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}
// --- Helper: Get Initials for Avatar (e.g. "Hassan Adel" -> "HA") ---
function getInitials(name) {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
}

// --- Helper: Map Status to CSS Class (Matches styles.css) ---
function getStatusClass(status) {
    if (!status) return 'screen';
    const s = status.toLowerCase();
    
    if (s.includes('hired') || s.includes('accepted')) return 'hired';
    if (s.includes('reject')) return 'rejected';
    if (s.includes('offer')) return 'offer';
    if (s.includes('interview')) return 'interview';
    
    return 'screen'; // Default gray
}

// --- Helper: Populate Position Filter (Already added previously, ensuring it exists) ---
function populateATSPositionFilter() {
    const select = document.getElementById('ats-filter-position');
    if (!select) return;
    const titles = [...new Set(systemData.requisitions.map(r => r.title))].sort();
    select.innerHTML = '<option value="All">All Positions</option>';
    titles.forEach(title => {
        if(title) select.innerHTML += `<option value="${title}">${title}</option>`;
    });
}
// ... (باقي أكواد الشارتات في الأعلى)

// ==========================================
// NEW: TARGET GAUGES (SPEEDOMETERS)
// ==========================================
function renderTargetGauges(reqs, cands) {
    // 1. Hiring Plan %
    const totalReqs = reqs.length;
    const filledReqs = reqs.filter(r => r.status === 'Filled').length;
    const planRate = totalReqs > 0 ? Math.round((filledReqs / totalReqs) * 100) : 0;

    // 2. Offer Acceptance %
    const offersMade = cands.filter(c => c.status === 'Hired' || c.status === 'Job Offer Phase').length;
    const hired = cands.filter(c => c.status === 'Hired').length;
    const offerRate = offersMade > 0 ? Math.round((hired / offersMade) * 100) : 0;

    // 3. SLA Adherence %
    const filledJobs = reqs.filter(r => r.status === 'Filled' && r.filled_date);
    let onTime = 0;
    filledJobs.forEach(r => {
        if (new Date(r.filled_date) <= new Date(r.target_date)) onTime++;
    });
    const slaRate = filledJobs.length > 0 ? Math.round((onTime / filledJobs.length) * 100) : 0;

    // Draw Charts
    drawGauge('gaugePlan', planRate, '#1B154A'); // Navy
    drawGauge('gaugeOffer', offerRate, '#C4161C'); // Red
    drawGauge('gaugeSLA', slaRate, '#198754');    // Green
}

function drawGauge(canvasId, value, color) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return; // حماية في حالة عدم وجود العنصر
    
    const context = ctx.getContext('2d');
    
    // Update Text Value
    const textEl = document.getElementById(`val-${canvasId}`);
    if(textEl) {
        textEl.innerText = `${value}%`;
        textEl.style.color = color;
    }

    // Destroy if exists to prevent overlapping
    if (window[canvasId] instanceof Chart) {
        window[canvasId].destroy();
    }

    window[canvasId] = new Chart(context, {
        type: 'doughnut',
        data: {
            labels: ['Achieved', 'Remaining'],
            datasets: [{
                data: [value, 100 - value],
                backgroundColor: [color, '#e2e8f0'],
                borderWidth: 0,
                circumference: 180, // Half circle
                rotation: 270       // Start from left
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%', // Thickness
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });
    
}
// ==========================================
// 8. RESET FUNCTION (Must be Global)
// ==========================================
function resetDashboardFilters() {
    console.log("Reset Button Clicked!"); // للتأكد من أن الزر يستجيب

    // 1. Reset Year to Current Year
    const yearSelect = document.getElementById('filter-year');
    if (yearSelect) {
        yearSelect.value = new Date().getFullYear().toString();
    }

    // 2. Reset Month to Current Month
    const monthSelect = document.getElementById('filter-month');
    if (monthSelect) {
        // "01", "02" ... صيغة الشهر
        monthSelect.value = String(new Date().getMonth() + 1).padStart(2, '0');
    }

    // 3. Reset Dept & Recruiter to "All"
    if(document.getElementById('filter-dept')) document.getElementById('filter-dept').value = 'All';
    if(document.getElementById('filter-recruiter')) document.getElementById('filter-recruiter').value = 'All';

    // 4. Re-render Dashboard
    renderDashboard();
}
