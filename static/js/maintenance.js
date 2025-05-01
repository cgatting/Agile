// Import the shared DataManager instance
import { dataManager } from './data.js';

/**
 * Maintenance management functionality for AquaAlert
 */
export class MaintenanceManager {
    constructor() {
        this.currentView = 'list';
        this.currentWeek = new Date();
        // Use the shared dataManager for fetching data
        this.dataManager = dataManager;
        // Initialize Bootstrap modals
        this.addModal = new bootstrap.Modal(document.getElementById('addMaintenanceModal'));
        this.detailsModal = new bootstrap.Modal(document.getElementById('maintenanceDetailsModal'));
        this.initializeEventListeners();
        this.loadMaintenanceData();
    }

    initializeEventListeners() {
        // Search and filter handlers
        document.getElementById('searchMaintenance').addEventListener('input', () => this.filterRecords());
        document.getElementById('typeFilter').addEventListener('change', () => this.filterRecords());
        document.getElementById('statusFilter').addEventListener('change', () => this.filterRecords());
        document.getElementById('priorityFilter').addEventListener('change', () => this.filterRecords());

        // Calendar navigation
        document.getElementById('prevWeek').addEventListener('click', () => this.navigateWeek(-1));
        document.getElementById('nextWeek').addEventListener('click', () => this.navigateWeek(1));

        // View toggle
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.toggleView(e.currentTarget.dataset.view);
            });
        });

        // Modal handlers
        document.getElementById('addMaintenanceBtn').addEventListener('click', async () => {
            // Hide details modal in case it's open
            this.detailsModal.hide();
            // Populate and reset form for new record
            await this.populateBowserSelect();
            const form = document.getElementById('addMaintenanceForm');
            form.reset();
            document.getElementById('maintenanceId').value = '';
            document.getElementById('addMaintenanceModalLabel').textContent = 'Schedule Maintenance';
            document.getElementById('scheduleMaintBtn').textContent = 'Schedule Maintenance';
            this.addModal.show();
        });

        // Form submission: schedule/save button
        document.getElementById('scheduleMaintBtn').addEventListener('click', () => this.addNewMaintenance());
        // Today button and week picker
        document.getElementById('todayBtn').addEventListener('click', () => {
            this.currentWeek = new Date();
            this.updateCalendar();
        });
        document.getElementById('weekPicker').addEventListener('change', (e) => {
            this.currentWeek = new Date(e.target.value);
            this.updateCalendar();
        });
        // Edit and delete actions
        document.getElementById('editMaintBtn').addEventListener('click', () => this.openEditModal());
        document.getElementById('deleteMaintBtn').addEventListener('click', () => this.deleteMaintenance());
    }

    async loadMaintenanceData() {
        try {
            // Ensure data is loaded/refreshed
            await this.dataManager.initializeData();
            // Pull maintenance records from dataManager
            const records = this.dataManager.getMaintenanceDue();
            this.updateCalendar();
            this.displayMaintenanceRecords(records);
        } catch (error) {
            console.error('Error loading maintenance records:', error);
            this.showNotification('Error loading maintenance records', 'error');
        }
    }

    updateCalendar() {
        const calendar = document.getElementById('maintenanceCalendar');
        calendar.innerHTML = '';

        // Update week display
        const startDate = this.getWeekStartDate(this.currentWeek);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);

        document.getElementById('currentWeek').textContent = 
            `${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${
                endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;

        // Create calendar grid
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        days.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.innerHTML = `<div class="day-header">${day}</div>`;
            calendar.appendChild(dayElement);
        });

        // Populate calendar with maintenance events
        this.populateCalendarEvents(startDate);
    }

    populateCalendarEvents(startDate) {
        const days = document.querySelectorAll('.calendar-day');
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(currentDate.getDate() + i);
            
            // Mark today
            if (currentDate.toDateString() === today.toDateString()) {
                days[i].classList.add('today');
            }

            // Add date to header
            const header = days[i].querySelector('.day-header');
            header.textContent = `${header.textContent}\n${currentDate.getDate()}`;

            // Find maintenance records for this day using 'date' field
            const dayRecords = this.dataManager.getMaintenanceDue().filter(record => {
                const recordDate = new Date(record.date);
                return recordDate.toDateString() === currentDate.toDateString();
            });

            // Add events to calendar
            dayRecords.forEach(record => {
                const eventElement = document.createElement('div');
                eventElement.className = `maintenance-event event-${record.priority}`;
                const bowser = this.dataManager.getBowsers().find(b => b.id === record.bowser_id);
                eventElement.textContent = `${record.maintenance_type}: Bowser ${bowser?.number || 'Unknown'}`;
                eventElement.addEventListener('click', () => this.viewMaintenanceDetails(record.id));
                days[i].appendChild(eventElement);
            });
        }
    }

    displayMaintenanceRecords(records) {
        // If the table element exists, populate DataTable
        const tableElem = document.getElementById('maintenanceTable');
        if (tableElem) {
            // Clear existing DataTable if initialized
            if ($.fn.DataTable.isDataTable('#maintenanceTable')) {
                $('#maintenanceTable').DataTable().clear().destroy();
            }
            const tbody = document.getElementById('maintenanceTbody');
            tbody.innerHTML = '';
            records.forEach(record => {
                const bowser = this.dataManager.getBowsers().find(b => b.id === record.bowser_id);
                const statusText = record.status.replace('_', '-');
                const dateText = new Date(record.date).toLocaleString();
                const priorityText = record.priority.charAt(0).toUpperCase() + record.priority.slice(1);
                const assignedTo = record.assigned_to || '';
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${bowser?.number || 'Unknown'}</td>
                    <td>${record.maintenance_type}</td>
                    <td>${record.description}</td>
                    <td><span class="status-${statusText}">${statusText.charAt(0).toUpperCase() + statusText.slice(1)}</span></td>
                    <td><span class="priority-${record.priority}">${priorityText}</span></td>
                    <td>${dateText}</td>
                    <td>${assignedTo}</td>
                `;
                tbody.appendChild(tr);
            });
            // Initialize DataTable with options
            $('#maintenanceTable').DataTable({
                responsive: true,
                pageLength: 10
            });
        } else {
            // Fallback to card/kanban view
            const container = document.getElementById('maintenanceRecords');
            container.innerHTML = '';
            if (this.currentView === 'list') {
                records.forEach(record => {
                    const card = this.createMaintenanceCard(record);
                    container.appendChild(card);
                });
            } else {
                this.displayKanbanView(records);
            }
        }
    }

    createMaintenanceCard(record) {
        const bowser = this.dataManager.getBowsers().find(b => b.id === record.bowser_id);
        const card = document.createElement('div');
        card.className = 'maintenance-card';
        card.setAttribute('draggable', true);
        
        // Display maintenance record using correct fields
        const statusText = record.status.replace('_', '-');
        card.innerHTML = `
            <div class="maintenance-info">
                <div>
                    <h3>Bowser ${bowser?.number || 'Unknown'}</h3>
                    <p>${record.description}</p>
                    <div class="maintenance-status status-${statusText}">
                        ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}
                    </div>
                    <div class="priority-indicator priority-${record.priority}">
                        <i class="fas fa-flag"></i> ${record.priority.charAt(0).toUpperCase() + record.priority.slice(1)}
                    </div>
                    <div class="assigned-to"><i class="fas fa-user-cog"></i> ${record.assigned_to}</div>
                    <div class="status-update">
                        <select class="form-select form-select-sm status-select">
                            <option value="scheduled" ${record.status==='scheduled'?'selected':''}>Scheduled</option>
                            <option value="in-progress" ${record.status==='in_progress'?'selected':''}>In Progress</option>
                            <option value="completed" ${record.status==='completed'?'selected':''}>Completed</option>
                            <option value="overdue" ${record.status==='overdue'?'selected':''}>Overdue</option>
                        </select>
                    </div>
                </div>
                <div>
                    <p><i class="fas fa-calendar"></i> ${new Date(record.date).toLocaleDateString()}</p>
                </div>
            </div>
        `;
        // Handle status change
        card.querySelector('.status-select').addEventListener('change', async (e) => {
            const newStatus = e.target.value.replace('-', '_');
            await fetch(`/api/maintenance/${record.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            this.loadMaintenanceData();
        });
        // Drag start
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', record.id);
        });
        card.addEventListener('click', () => this.viewMaintenanceDetails(record.id));
        return card;
    }

    displayKanbanView(records) {
        const container = document.getElementById('maintenanceRecords');
        container.className = 'kanban-view';
        
        const columns = {
            scheduled: [],
            'in-progress': [],
            completed: [],
            overdue: []
        };

        // Sort records into columns
        records.forEach(record => {
            columns[record.status].push(record);
        });

        // Create columns
        Object.entries(columns).forEach(([status, statusRecords]) => {
            const column = document.createElement('div');
            column.className = 'kanban-column';
            column.innerHTML = `
                <h3>${status.charAt(0).toUpperCase() + status.slice(1)}</h3>
                <div class="kanban-cards"></div>
            `;

            const cardsContainer = column.querySelector('.kanban-cards');
            // Allow dropping to change status
            cardsContainer.addEventListener('dragover', e => e.preventDefault());
            cardsContainer.addEventListener('drop', async e => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                await fetch(`/api/maintenance/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: status.replace('-', '_') })
                });
                this.loadMaintenanceData();
            });
            statusRecords.forEach(record => {
                cardsContainer.appendChild(this.createMaintenanceCard(record));
            });

            container.appendChild(column);
        });
    }

    async viewMaintenanceDetails(id) {
        // Get the maintenance record by ID
        const record = this.dataManager.getMaintenanceDue().find(r => r.id === id);
        if (!record) return;

        const bowser = this.dataManager.getBowsers().find(b => b.id === record.bowser_id);
        const modal = document.getElementById('maintenanceDetailsModal');
        const content = document.getElementById('maintenanceDetailsContent');
        // Store for edit/delete
        this.currentRecord = record;
        document.getElementById('maintenanceId').value = record.id;
        
        // Convert status format
        const status = record.status.replace('_', '-');

        content.innerHTML = `
            <div class="details-grid">
                <div class="detail-item">
                    <label>Bowser</label>
                    <span>${bowser?.number || 'Unknown'}</span>
                </div>
                <div class="detail-item">
                    <label>Type</label>
                    <span>${record.maintenance_type}</span>
                </div>
                <div class="detail-item">
                    <label>Status</label>
                    <span class="status-${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                </div>
                <div class="detail-item">
                    <label>Scheduled Date</label>
                    <span>${new Date(record.date).toLocaleString()}</span>
                </div>
                <div class="detail-item">
                    <label>Priority</label>
                    <span class="priority-${record.priority}">${record.priority.charAt(0).toUpperCase() + record.priority.slice(1)}</span>
                </div>
                <div class="detail-item">
                    <label>Assigned To</label>
                    <span>${record.assigned_to}</span>
                </div>
                <div class="detail-item full-width">
                    <label>Description</label>
                    <p>${record.description}</p>
                </div>
            </div>
        `;

        this.detailsModal.show();
    }

    async addNewMaintenance() {
        const form = document.getElementById('addMaintenanceForm');
        const id = document.getElementById('maintenanceId').value;
        const formData = {
            bowser_id: form.bowserId.value,
            maintenance_type: form.maintenanceType.value,
            description: form.description.value,
            date: form.scheduledDate.value,
            priority: form.priority.value,
            assigned_to: form.assignedTo.value,
            status: 'scheduled'
        };

        try {
            if (id) {
                // Update existing record
                await fetch(`/api/maintenance/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                this.showNotification('Maintenance updated successfully', 'success');
            } else {
                // Create new record
                await fetch(`/api/maintenance`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                this.showNotification('Maintenance scheduled successfully', 'success');
            }
            // Clear edit id
            document.getElementById('maintenanceId').value = '';
        } catch (error) {
            console.error('Error saving maintenance record:', error);
            this.showNotification('Error saving maintenance', 'error');
        } finally {
            await this.loadMaintenanceData();
            this.addModal.hide();
        }
    }

    // Populate bowser dropdown by fetching available bowsers
    async populateBowserSelect() {
        const select = document.getElementById('bowserId');
        select.innerHTML = '';
        try {
            const bowsers = this.dataManager.getBowsers();
            bowsers.forEach(bowser => {
                const option = document.createElement('option');
                option.value = bowser.id;
                option.textContent = `Bowser ${bowser.number}`;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating bowser select:', error);
        }
    }

    filterRecords() {
        const searchTerm = document.getElementById('searchMaintenance').value.toLowerCase();
        const typeFilter = document.getElementById('typeFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        const priorityFilter = document.getElementById('priorityFilter').value;

        let records = this.dataManager.getMaintenanceDue();

        // Apply filters
        records = records.filter(record => {
            const matchesSearch = record.description.toLowerCase().includes(searchTerm) ||
                                  this.dataManager.getBowsers().find(b => b.id === record.bowser_id)?.number.toString().toLowerCase().includes(searchTerm);
            const matchesType = typeFilter === 'all' || record.maintenance_type === typeFilter;
            
            // Convert status format for comparison (e.g., in_progress to in-progress)
            const recordStatus = record.status.replace('_', '-');
            const matchesStatus = statusFilter === 'all' || recordStatus === statusFilter;
            
            const matchesPriority = priorityFilter === 'all' || record.priority === priorityFilter;

            return matchesSearch && matchesType && matchesStatus && matchesPriority;
        });

        this.displayMaintenanceRecords(records);
    }

    navigateWeek(direction) {
        this.currentWeek.setDate(this.currentWeek.getDate() + (direction * 7));
        this.updateCalendar();
    }

    toggleView(view) {
        this.currentView = view;
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        this.loadMaintenanceData();
    }

    getWeekStartDate(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        
        if (notification && notificationText) {
            notificationText.textContent = message;
            notification.className = `notification ${type}`;
            notification.style.display = 'block';
            
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }
    }

    // Open modal in edit mode, pre-populate form
    async openEditModal() {
        // Hide current details display and show form instead
        this.detailsModal.hide();
        const record = this.currentRecord;
        if (!record) return;
        // Populate bowsers then fill form for editing
        await this.populateBowserSelect();
        const form = document.getElementById('addMaintenanceForm');
        form.reset();
        document.getElementById('maintenanceId').value = record.id;
        document.getElementById('bowserId').value = record.bowser_id;
        document.getElementById('maintenanceType').value = record.maintenance_type;
        document.getElementById('description').value = record.description;
        document.getElementById('scheduledDate').value = new Date(record.date).toISOString().slice(0,16);
        document.getElementById('priority').value = record.priority;
        document.getElementById('assignedTo').value = record.assigned_to;
        document.getElementById('addMaintenanceModalLabel').textContent = 'Edit Maintenance';
        document.getElementById('scheduleMaintBtn').textContent = 'Save Changes';
        this.addModal.show();
    }
    
    // Delete current maintenance record
    async deleteMaintenance() {
        const id = document.getElementById('maintenanceId').value;
        if (!id || !confirm('Are you sure you want to delete this maintenance record?')) return;
        try {
            await fetch(`/api/maintenance/${id}`, { method: 'DELETE' });
            this.detailsModal.hide();
            this.showNotification('Maintenance record deleted', 'success');
            this.loadMaintenanceData();
        } catch (error) {
            console.error('Error deleting maintenance:', error);
            this.showNotification('Error deleting maintenance', 'error');
        }
    }
}

// Initialize maintenance manager when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Set CONFIG to use real data instead of mock data
    if (typeof CONFIG !== 'undefined') {
        CONFIG.mockData.enabled = false;
    }
    
    const maintenanceManager = new MaintenanceManager();
});
