// AquaAlert User Management JavaScript
// This file contains the functionality for the Edit and Delete buttons in the user management interface

// Function to show notification after operations
function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'position-fixed bottom-0 end-0 p-3';
    notification.style.zIndex = '5';
    notification.innerHTML = `
        <div class="toast show bg-${type === 'success' ? 'success' : 'danger'} text-white" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <strong class="me-auto">Notification</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Initialize the user management functionality
function initUserManagement() {
    // Toggle password visibility for create user form
    document.getElementById('togglePassword')?.addEventListener('click', function() {
        const passwordField = document.getElementById('password');
        const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordField.setAttribute('type', type);
        this.querySelector('i').classList.toggle('fa-eye');
        this.querySelector('i').classList.toggle('fa-eye-slash');
    });

    // Show flash messages as notifications if they exist
    const flashMessages = document.querySelectorAll('.alert');
    flashMessages.forEach(message => {
        const messageText = message.textContent.trim();
        const messageType = message.classList.contains('alert-danger') ? 'danger' : 'success';
        if (messageText) {
            showNotification(messageText, messageType);
        }
        // Hide the original flash message
        message.style.display = 'none';
    });

    // Setup Edit user functionality
    document.querySelectorAll('.edit-user-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            const userRow = this.closest('tr');
            
            // Extract user data from the table row (as a fallback if API fails)
            const username = userRow.querySelector('td:nth-child(2)').textContent.trim();
            const email = userRow.querySelector('td:nth-child(3)').textContent.trim();
            const role = userRow.querySelector('td:nth-child(4) .badge').textContent.trim();
            
            // Try to fetch user data from the server
            // If that fails, use the data from the table
            fetch(`/admin/users/edit/${userId}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(user => {
                    // Display the edit modal with server data
                    showEditModal(userId, user);
                })
                .catch(error => {
                    console.error('Error fetching user data:', error);
                    // Fallback to using data from the table
                    showEditModal(userId, { username, email, role });
                });
        });
    });

    // Setup Delete user functionality
    document.querySelectorAll('.delete-user-btn').forEach(button => {
        button.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            const username = this.closest('tr').querySelector('td:nth-child(2)').textContent.trim();
            showDeleteModal(userId, username);
        });
    });
}

// Function to show edit modal
function showEditModal(userId, user) {
    // Check if a modal already exists and remove it
    const existingModal = document.getElementById('editUserModal');
    if (existingModal) {
        const modalInstance = bootstrap.Modal.getInstance(existingModal);
        if (modalInstance) modalInstance.dispose();
        existingModal.remove();
    }
    
    // Clean up any existing modal backdrops
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.remove();
    });
    
    // Create edit modal
    const modalHtml = `
        <div class="modal fade" id="editUserModal" tabindex="-1" aria-labelledby="editUserModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title" id="editUserModalLabel">Edit User</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editUserForm" method="POST" action="/admin/users/edit/${userId}">
                            <div class="mb-3">
                                <label for="editUsername" class="form-label">Username</label>
                                <input type="text" class="form-control" id="editUsername" name="username" value="${user.username}" required>
                            </div>
                            <div class="mb-3">
                                <label for="editEmail" class="form-label">Email</label>
                                <input type="email" class="form-control" id="editEmail" name="email" value="${user.email}" required>
                            </div>
                            <div class="mb-3">
                                <label for="editPassword" class="form-label">Password</label>
                                <div class="input-group">
                                    <input type="password" class="form-control" id="editPassword" name="password" placeholder="Leave blank to keep current password">
                                    <button class="btn btn-outline-secondary" type="button" id="toggleEditPassword">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                                <div class="form-text">Leave blank to keep current password</div>
                            </div>
                            <div class="mb-3">
                                <label for="editRole" class="form-label">Role</label>
                                <select class="form-select" id="editRole" name="role">
                                    <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>Staff</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="saveUserBtn">
                            <i class="fas fa-save me-2"></i>Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Create a dedicated container for the modal
    const modalContainer = document.createElement('div');
    modalContainer.id = 'editUserModalContainer';
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Initialize modal
    const modal = new bootstrap.Modal(document.getElementById('editUserModal'), {
        backdrop: 'static',
        keyboard: false
    });
    modal.show();
    
    // Toggle password visibility
    document.getElementById('toggleEditPassword').addEventListener('click', function() {
        const passwordField = document.getElementById('editPassword');
        const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordField.setAttribute('type', type);
        this.querySelector('i').classList.toggle('fa-eye');
        this.querySelector('i').classList.toggle('fa-eye-slash');
    });
    
    // Handle form submission
    document.getElementById('saveUserBtn').addEventListener('click', function() {
        // Basic client-side validation
        const username = document.getElementById('editUsername').value;
        const email = document.getElementById('editEmail').value;
        
        if (!username || !email) {
            showNotification('Username and email are required', 'danger');
            return;
        }
        
        // Submit the form
        document.getElementById('editUserForm').submit();
    });
    
    // Properly clean up when modal is hidden
    document.getElementById('editUserModal').addEventListener('hidden.bs.modal', function() {
        // Clean up any lingering backdrop
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.remove();
        });
        // Remove body class that Bootstrap adds
        document.body.classList.remove('modal-open');
        // Remove inline styles Bootstrap adds
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
        // Remove the modal container
        const container = document.getElementById('editUserModalContainer');
        if (container) container.remove();
    });
}

// Function to show delete modal
function showDeleteModal(userId, username) {
    // Check if a modal already exists and remove it
    const existingModal = document.getElementById('deleteUserModal');
    if (existingModal) {
        const modalInstance = bootstrap.Modal.getInstance(existingModal);
        if (modalInstance) modalInstance.dispose();
        existingModal.remove();
    }
    
    // Clean up any existing modal backdrops
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.remove();
    });
    
    // Create confirmation modal
    const modalHtml = `
        <div class="modal fade" id="deleteUserModal" tabindex="-1" aria-labelledby="deleteUserModalLabel" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title" id="deleteUserModalLabel">Confirm Delete</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="d-flex align-items-center mb-3">
                            <i class="fas fa-exclamation-triangle text-danger fa-2x me-3"></i>
                            <div>
                                <p class="mb-1">Are you sure you want to delete the user <strong>${username}</strong>?</p>
                                <p class="text-danger mb-0"><strong>This action cannot be undone.</strong></p>
                            </div>
                        </div>
                        <form id="deleteUserForm" method="POST" action="/admin/users/delete/${userId}">
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger" id="confirmDeleteBtn">
                            <i class="fas fa-trash me-2"></i>Delete User
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Create a dedicated container for the modal
    const modalContainer = document.createElement('div');
    modalContainer.id = 'deleteUserModalContainer';
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);
    
    // Initialize modal
    const modal = new bootstrap.Modal(document.getElementById('deleteUserModal'), {
        backdrop: 'static',
        keyboard: false
    });
    modal.show();
    
    // Handle form submission
    document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
        document.getElementById('deleteUserForm').submit();
    });
    
    // Properly clean up when modal is hidden
    document.getElementById('deleteUserModal').addEventListener('hidden.bs.modal', function() {
        // Clean up any lingering backdrop
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.remove();
        });
        // Remove body class that Bootstrap adds
        document.body.classList.remove('modal-open');
        // Remove inline styles Bootstrap adds
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
        // Remove the modal container
        const container = document.getElementById('deleteUserModalContainer');
        if (container) container.remove();
    });
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initUserManagement);
