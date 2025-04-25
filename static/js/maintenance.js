/**
 * Maintenance management functionality for AquaAlert
 */
class MaintenanceManager {
    constructor() {
        this.currentView = 'list';
        this.currentWeek = new Date();
        this.dbHandler = new DatabaseHandler();
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
        const addMaintenanceBtn = document.getElementById('addMaintenanceBtn');
        const addMaintenanceModal = document.getElementById('addMaintenanceModal');
        const closeModalBtns = document.querySelectorAll('.close-modal, .cancel-btn');

        addMaintenanceBtn.addEventListener('click', () => {
            this.populateBowserSelect();
            addMaintenanceModal.style.display = 'block';
        });

        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                addMaintenanceModal.style.display = 'none';
                document.getElementById('maintenanceDetailsModal').style.display = 'none';
            });
        });

        // Form submission
        document.getElementById('addMaintenanceForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addNewMaintenance();
        });
    }

    async loadMaintenanceData() {
        try {
            // Load data from the database if not already loaded
            if (!this.dbHandler.dataLoaded) {
                await this.dbHandler.loadData();
            }
            
            // Get maintenance records from the database
            const records = this.dbHandler.getMaintenanceRecords();
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
            const dateHeader = days[i].querySelector('.day-header');
            dateHeader.textContent = `${days[i].querySelector('.day-header').textContent}\n${
                currentDate.getDate()}`;

            // Find maintenance events for this day
            const events = this.dbHandler.getMaintenanceRecords().filter(record => {
                const scheduledDate = new Date(record.scheduled_date);
                return scheduledDate.toDateString() === currentDate.toDateString();
            });

            // Add events to calendar
            events.forEach(event => {
                const eventElement = document.createElement('div');
                eventElement.className = `maintenance-event event-${event.priority}`;
                const bowser = dataManager.getBowserById(event.bowserId);
                eventElement.textContent = `${event.type}: Bowser ${bowser?.number || 'Unknown'}`;
                eventElement.addEventListener('click', () => this.viewMaintenanceDetails(event.id));
                days[i].appendChild(eventElement);
            });
        }
    }

    displayMaintenanceRecords(records) {
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

    createMaintenanceCard(record) {
        const bowser = this.dbHandler.getBowserById(record.bowser_id);
        const card = document.createElement('div');
        card.className = 'maintenance-card';
        
        // Convert status format (e.g., in_progress to in-progress)
        const status = record.status.replace('_', '-');
        
        card.innerHTML = `
            <div class="maintenance-info">
                <div>
                    <h3>Bowser ${bowser?.number || 'Unknown'}</h3>
                    <p>${record.description}</p>
                    <div class="maintenance-status status-${status}">
                        ${status.charAt(0).toUpperCase() + status.slice(1)}
                    </div>
                    <div class="priority-indicator priority-${record.priority || 'medium'}">
                        <i class="fas fa-flag"></i>
                        ${(record.priority || 'Medium').charAt(0).toUpperCase() + (record.priority || 'medium').slice(1)} Priority
                    </div>
                </div>
                <div>
                    <p><i class="fas fa-calendar"></i> ${new Date(record.scheduled_date).toLocaleDateString()}</p>
                    <p><i class="fas fa-user-cog"></i> ${record.assigned_to}</p>
                </div>
            </div>
        `;

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
            statusRecords.forEach(record => {
                cardsContainer.appendChild(this.createMaintenanceCard(record));
            });

            container.appendChild(column);
        });
    }

    async viewMaintenanceDetails(id) {
        // Get the maintenance record by ID
        const record = await this.dbHandler.getMaintenanceRecordById(id);
        if (!record) return;

        const bowser = this.dbHandler.getBowserById(record.bowser_id);
        const modal = document.getElementById('maintenanceDetailsModal');
        const content = document.getElementById('maintenanceDetailsContent');
        
        // Convert status format (e.g., in_progress to in-progress)
        const status = record.status.replace('_', '-');

        content.innerHTML = `
            <div class="details-grid">
                <div class="detail-item">
                    <label>Bowser</label>
                    <span>${bowser?.number || 'Unknown'}</span>
                </div>
                <div class="detail-item">
                    <label>Type</label>
                    <span>${record.type}</span>
                </div>
                <div class="detail-item">
                    <label>Status</label>
                    <span class="status-${status}">${status}</span>
                </div>
                <div class="detail-item">
                    <label>Priority</label>
                    <span class="priority-${record.priority || 'medium'}">${(record.priority || 'Medium')}</span>
                </div>
                <div class="detail-item">
                    <label>Scheduled Date</label>
                    <span>${new Date(record.scheduled_date).toLocaleString()}</span>
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

        modal.style.display = 'block';
    }

    async addNewMaintenance() {
        const form = document.getElementById('addMaintenanceForm');
        const formData = {
            bowser_id: form.bowserId.value,
            type: form.maintenanceType.value,
            description: form.description.value,
            scheduled_date: form.scheduledDate.value,
            priority: form.priority.value,
            assigned_to: form.assignedTo.value,
            status: 'scheduled'
        };

        try {
            // Add to database
            await fetch(`${this.dbHandler.API_BASE_URL}/maintenance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            // Update UI
            await this.loadMaintenanceData();
            document.getElementById('addMaintenanceModal').style.display = 'none';
            this.showNotification('Maintenance scheduled successfully', 'success');
        } catch (error) {
            console.error('Error adding maintenance record:', error);
            this.showNotification('Error scheduling maintenance', 'error');
        }
    }

    populateBowserSelect() {
        const select = document.getElementById('bowserId');
        select.innerHTML = '';
        
        this.dbHandler.getBowsers().forEach(bowser => {
            const option = document.createElement('option');
            option.value = bowser.id;
            option.textContent = `Bowser ${bowser.number}`;
            select.appendChild(option);
        });
    }

    filterRecords() {
        const searchTerm = document.getElementById('searchMaintenance').value.toLowerCase();
        const typeFilter = document.getElementById('typeFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        const priorityFilter = document.getElementById('priorityFilter').value;

        let records = this.dbHandler.getMaintenanceRecords();

        // Apply filters
        records = records.filter(record => {
            const matchesSearch = record.description.toLowerCase().includes(searchTerm);
            const matchesType = typeFilter === 'all' || record.type === typeFilter;
            
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
}

// Initialize maintenance manager when the page loads
let maintenanceManager;
document.addEventListener('DOMContentLoaded', async () => {
    // Set CONFIG to use real data instead of mock data
    if (typeof CONFIG !== 'undefined') {
        CONFIG.mockData.enabled = false;
    }
    
    maintenanceManager = new MaintenanceManager();
});
