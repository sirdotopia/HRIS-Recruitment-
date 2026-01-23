/**
 * ACROW HRIS & ATS MODULE - SESSION MANAGEMENT & NOTIFICATIONS
 * Version: 5.0
 * Includes: Authentication, Session Management, Toast Notifications, Delete Functions
 */

// ==========================================
// SESSION & AUTHENTICATION MANAGEMENT
// ==========================================

let sessionTimeout;
const SESSION_TIMEOUT_MS = 1800000; // 30 minutes

function initializeSessionManagement() {
    /**
     * Initialize session checking and auto-logout
     */
    checkSessionValidity();
    resetSessionTimeout();
    
    // Check session every 5 minutes
    setInterval(checkSessionValidity, 300000);
    
    // Reset timeout on user activity
    document.addEventListener('click', resetSessionTimeout);
    document.addEventListener('keypress', resetSessionTimeout);
    document.addEventListener('mousemove', resetSessionTimeout);
}

function checkSessionValidity() {
    /**
     * Verify that the current session is still valid
     */
    fetch('/api/session-check')
        .then(response => {
            if (!response.ok) {
                handleSessionExpired();
            }
            return response.json();
        })
        .then(data => {
            if (!data.authenticated) {
                handleSessionExpired();
            }
        })
        .catch(error => {
            console.error('Session check error:', error);
        });
}

function resetSessionTimeout() {
    /**
     * Reset the session timeout timer
     */
    clearTimeout(sessionTimeout);
    sessionTimeout = setTimeout(() => {
        handleSessionExpired();
    }, SESSION_TIMEOUT_MS);
}

function handleSessionExpired() {
    /**
     * Handle session expiration
     */
    showToast('Your session has expired. Please log in again.', 'warning');
    setTimeout(() => {
        window.location.href = '/login';
    }, 2000);
}

async function handleLogout() {
    /**
     * Handle user logout
     */
    try {
        const response = await fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            showToast('Logged out successfully', 'success');
            setTimeout(() => {
                window.location.href = '/login';
            }, 1000);
        } else {
            showToast('Error logging out', 'danger');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error logging out', 'danger');
    }
}

// ==========================================
// TOAST NOTIFICATION SYSTEM
// ==========================================

function showToast(message, type = 'info', duration = 4000) {
    /**
     * Display a toast notification
     * @param {string} message - The message to display
     * @param {string} type - Type: 'success', 'danger', 'warning', 'info'
     * @param {number} duration - Duration in milliseconds
     */
    
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
        `;
        document.body.appendChild(toastContainer);
    }

    // Create toast element
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
            <button onclick="closeToast('${toastId}')" style="
                background: none;
                border: none;
                color: inherit;
                cursor: pointer;
                font-size: 18px;
                padding: 0;
                opacity: 0.7;
                transition: opacity 0.2s;
            " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHTML);

    // Auto-remove after duration
    setTimeout(() => {
        closeToast(toastId);
    }, duration);
}

function closeToast(toastId) {
    /**
     * Close a toast notification
     */
    const toast = document.getElementById(toastId);
    if (toast) {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }
}

function getToastBackground(type) {
    const backgrounds = {
        'success': '#dcfce7',
        'danger': '#fee2e2',
        'warning': '#fef3c7',
        'info': '#dbeafe'
    };
    return backgrounds[type] || backgrounds['info'];
}

function getToastColor(type) {
    const colors = {
        'success': '#166534',
        'danger': '#991b1b',
        'warning': '#92400e',
        'info': '#1e40af'
    };
    return colors[type] || colors['info'];
}

function getToastBorderColor(type) {
    const borders = {
        'success': '#22c55e',
        'danger': '#dc2626',
        'warning': '#f59e0b',
        'info': '#3b82f6'
    };
    return borders[type] || borders['info'];
}

function getToastIcon(type) {
    const icons = {
        'success': 'check-circle',
        'danger': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || icons['info'];
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ==========================================
// DELETE FUNCTIONS WITH CONFIRMATION
// ==========================================

function showDeleteConfirmation(resourceType, resourceId, resourceName) {
    /**
     * Show a confirmation dialog before deleting
     */
    const confirmMessage = `Are you sure you want to delete ${resourceName}? This action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
        deleteResource(resourceType, resourceId, resourceName);
    }
}

async function deleteResource(resourceType, resourceId, resourceName) {
    /**
     * Delete a resource from the system
     */
    try {
        const response = await fetch(`/api/delete/${resourceType}/${resourceId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok && data.status === 'success') {
            showToast(`${resourceName} deleted successfully`, 'success');
            // Reload data after deletion
            setTimeout(() => {
                loadData();
            }, 500);
        } else {
            showToast(data.message || 'Error deleting resource', 'danger');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Error deleting resource', 'danger');
    }
}

// ==========================================
// ENHANCED FETCH WITH AUTHENTICATION
// ==========================================

async function authenticatedFetch(url, options = {}) {
    /**
     * Wrapper for fetch that handles authentication
     */
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };

    try {
        const response = await fetch(url, mergedOptions);

        // Check if unauthorized
        if (response.status === 401) {
            handleSessionExpired();
            throw new Error('Unauthorized');
        }

        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}

// ==========================================
// ENHANCED FILE UPLOAD WITH CANDIDATE ID
// ==========================================

async function uploadCandidateCV(candidateId, file) {
    /**
     * Upload a CV file for a candidate
     */
    const formData = new FormData();
    formData.append('file', file);
    formData.append('candidate_id', candidateId);

    try {
        const response = await authenticatedFetch('/api/upload_cv', {
            method: 'POST',
            body: formData,
            headers: {} // Don't set Content-Type, let browser set it
        });

        const data = await response.json();

        if (response.ok && data.status === 'success') {
            showToast('CV uploaded successfully', 'success');
            return data.filename;
        } else {
            showToast(data.message || 'Error uploading CV', 'danger');
            return null;
        }
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Error uploading CV', 'danger');
        return null;
    }
}

// ==========================================
// NAVBAR LOGOUT BUTTON
// ==========================================

function addLogoutButton() {
    /**
     * Add logout button to the navbar
     */
    const navbarUserSection = document.getElementById('navbarUserSection');
    if (!navbarUserSection) return;

    // Check if logout button already exists
    if (document.getElementById('logoutBtn')) return;

    const userSectionHTML = `
        <div class="d-flex align-items-center gap-3">
            <div class="user-display">
                <span id="userDisplay" style="font-weight: 500;"></span>
            </div>
            <button id="logoutBtn" class="btn-logout" onclick="handleLogout()">
                <i class="fas fa-sign-out-alt me-2"></i>Logout
            </button>
        </div>
    `;

    navbarUserSection.innerHTML = userSectionHTML;

    // Update user display
    fetch('/api/session-check')
        .then(response => response.json())
        .then(data => {
            if (data.authenticated) {
                const userDisplay = document.getElementById('userDisplay');
                if (userDisplay) {
                    userDisplay.textContent = `Welcome, ${data.user}`;
                }
            }
        })
        .catch(error => console.error('Error fetching user info:', error));
}

// ==========================================
// INITIALIZE ON PAGE LOAD
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize session management
    initializeSessionManagement();
    
    // Add logout button to navbar
    addLogoutButton();
    
    // Show welcome message
    fetch('/api/session-check')
        .then(response => response.json())
        .then(data => {
            if (data.authenticated) {
                showToast(`Welcome back, ${data.user}!`, 'info', 2000);
            }
        })
        .catch(error => console.error('Session check error:', error));
});
