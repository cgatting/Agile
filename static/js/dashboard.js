/**
 * Dashboard functionality for the AquaAlert application
 */
import { DataManager } from './data.js';

export class Dashboard {
    constructor() {
        this.dataManager = new DataManager();
        this.map = null;
        this.markers = [];
        this.performanceChart = null;
        this.refreshInterval = null;
        this.initialize();
    }

    async initialize() {
        try {
            console.log('Initializing dashboard...');
            await this.dataManager.initializeData();
            
            // Populate deployments table instead of map
            await this.updateDeploymentsTable();
            
            this.initializePerformanceChart();
            this.setupEventListeners();
            await this.updateDashboard();
            this.startRefreshInterval();
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            this.showNotification('Error initializing dashboard', 'error');
        }
    }

    async initializeMap() {
        try {
            const mapElement = document.getElementById('map');
            if (!mapElement) {
                console.error('Map element not found');
                return;
            }

            // Force a reflow to ensure the map container has proper dimensions
            mapElement.style.display = 'none';
            mapElement.offsetHeight; // Force reflow
            mapElement.style.display = 'block';

            // Initialize the map with default view
            this.map = L.map('map', {
                center: [51.505, -0.09],
                zoom: 13,
                zoomControl: true,
                scrollWheelZoom: true
            });

            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(this.map);

            // Force a map invalidation to ensure proper rendering
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);

            await this.updateMapMarkers();
        } catch (error) {
            console.error('Error initializing map:', error);
            this.showNotification('Error initializing map', 'error');
        }
    }

    async updateMapMarkers() {
        try {
            const deployments = await this.dataManager.getActiveDeployments();
            const locations = await this.dataManager.getLocations();
            const bowsers = await this.dataManager.getBowsers();

            // Clear existing markers
            this.markers.forEach(marker => {
                if (this.map) {
                    marker.remove();
                }
            });
            this.markers = [];

            // Add markers for active deployments
            if (Array.isArray(deployments)) {
                deployments.forEach(deployment => {
                    const location = locations.find(l => l.id === deployment.locationId);
                    const bowser = bowsers.find(b => b.id === deployment.bowserId);
                    
                    if (location && bowser) {
                        // Handle different coordinate formats
                        let coordinates;
                        if (Array.isArray(location.coordinates)) {
                            coordinates = location.coordinates;
                        } else if (location.coordinates && typeof location.coordinates === 'object') {
                            coordinates = [location.coordinates.lat, location.coordinates.lng];
                        } else if (location.latitude !== undefined && location.longitude !== undefined) {
                            coordinates = [location.latitude, location.longitude];
                        } else {
                            console.error('Invalid coordinates format for location:', location);
                            return;
                        }

                        const marker = L.marker(coordinates)
                            .bindPopup(`
                                <div class="marker-popup">
                                    <h3>${location.name}</h3>
                                    <p><i class="fas fa-truck"></i> Bowser: ${bowser.number}</p>
                                    <p><i class="fas fa-tint"></i> Supply Level: ${deployment.supplyLevel}%</p>
                                    <p><i class="fas fa-map-marker-alt"></i> ${location.address}</p>
                                    <p><i class="fas fa-envelope"></i> Postcode: ${this.extractPostcode(location.address) || 'N/A'}</p>
                                </div>
                            `);
                        
                        marker.addTo(this.map);
                        this.markers.push(marker);
                    }
                });
            }

            // Fit map bounds to show all markers if there are any
            if (this.markers.length > 0) {
                const group = new L.featureGroup(this.markers);
                this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
            } else {
                // Default to SW1 area if no markers
                this.map.setView([51.498, -0.134], 14);
            }
        } catch (error) {
            console.error('Error updating map markers:', error);
            this.showNotification('Error updating map markers', 'error');
        }
    }

    extractPostcode(address) {
        if (!address) return null;
        // Simple regex to match UK postcodes
        const postcodeRegex = /[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/i;
        const match = address.match(postcodeRegex);
        return match ? match[0].toUpperCase() : null;
    }

    /**
     * Initialize performance chart
     */
    initializePerformanceChart() {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;
        
        // Generate historical efficiency data (mock)
        const efficiencyData = this.generateHistoricalEfficiency();
        
        // Create chart
        this.performanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['6 days ago', '5 days ago', '4 days ago', '3 days ago', '2 days ago', 'Yesterday', 'Today'],
                datasets: [{
                    label: 'System Efficiency',
                    data: efficiencyData,
                    borderColor: '#2c5282',
                    backgroundColor: 'rgba(44, 82, 130, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#2c5282',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: 'white',
                        borderWidth: 0.5,
                        padding: 10,
                        callbacks: {
                            label: function(context) {
                                return `Efficiency: ${context.parsed.y}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 50,
                        max: 100,
                        ticks: {
                            stepSize: 10
                        },
                        grid: {
                            display: true,
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Generate mock historical efficiency data
     * @returns {Array} Historical efficiency percentages
     */
    generateHistoricalEfficiency() {
        // Current efficiency
        const currentEfficiency = this.calculateEfficiency();
        
        // Historical values (randomly fluctuating around current)
        const history = [];
        for (let i = 0; i < 6; i++) {
            const deviation = Math.random() * 10 - 5; // -5 to +5
            const value = Math.max(70, Math.min(98, currentEfficiency + deviation));
            history.push(Math.round(value));
        }
        
        // Add current value and return in chronological order
        return [...history, currentEfficiency];
    }
    
    /**
     * Calculate current system efficiency
     * @returns {number} Efficiency percentage
     */
    calculateEfficiency() {
        const deployedBowsers = this.dataManager.getBowsersByStatus('deployed').length;
        const totalBowsers = this.dataManager.getBowsers().length;
        const activeDeployments = this.dataManager.getActiveDeployments().length;
        const totalLocations = this.dataManager.getLocations().length;
        
        // Calculate components
        const fleetUsage = totalBowsers > 0 ? (deployedBowsers / totalBowsers) * 100 : 0;
        const coverageRate = totalLocations > 0 ? (activeDeployments / totalLocations) * 100 : 0;
        
        // Average for overall efficiency (additional factors could be added)
        const efficiency = Math.round((fleetUsage * 0.7) + (coverageRate * 0.3));
        
        return Math.min(100, Math.max(0, efficiency));
    }
    
    async updateDashboard() {
        try {
            console.log('Updating dashboard...');
            await this.updateStats();
            await this.updateDeploymentsTable();
            await this.updateTables();
            await this.updateAlerts();
            await this.updateSchedule();
            console.log('Dashboard updated successfully');
        } catch (error) {
            console.error('Error updating dashboard:', error);
            this.showNotification('Error updating dashboard', 'error');
        }
    }
    
    async updateStats() {
        try {
            console.log('Updating stats...');
            const activeBowsers = this.dataManager.getActiveDeployments().length;
            const maintenanceDue = this.dataManager.getMaintenanceDue().length;
            const activeLocations = this.dataManager.getLocations().filter(l => l.status === 'active').length;
            const emergencyAlerts = this.dataManager.getEmergencyAlerts().length;

            document.getElementById('activeBowsers').textContent = activeBowsers;
            document.getElementById('maintenanceDue').textContent = maintenanceDue;
            document.getElementById('activeLocations').textContent = activeLocations;
            document.getElementById('emergencyAlerts').textContent = emergencyAlerts;
            console.log('Stats updated:', { activeBowsers, maintenanceDue, activeLocations, emergencyAlerts });
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }
    
    async updateTables() {
        try {
            console.log('Updating tables...');
            const locations = this.dataManager.getLocations();
            const bowsers = this.dataManager.getBowsers();
            const users = this.dataManager.getUsers();

            console.log('Data for tables:', { locations, bowsers, users });

            // Update locations table
            const locationsTable = document.getElementById('locationsTable').getElementsByTagName('tbody')[0];
            if (locationsTable) {
                locationsTable.innerHTML = locations.map(location => `
                    <tr>
                        <td>${location.name}</td>
                        <td>${location.type}</td>
                        <td><span class="badge bg-${this.getStatusColor(location.status)}">${location.status}</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary edit-location" data-id="${location.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-location" data-id="${location.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }

            // Update bowsers table
            const bowsersTable = document.getElementById('bowsersTable').getElementsByTagName('tbody')[0];
            if (bowsersTable) {
                bowsersTable.innerHTML = bowsers.map(bowser => `
                    <tr>
                        <td>${bowser.number}</td>
                        <td>${bowser.capacity}L</td>
                        <td><span class="badge bg-${this.getStatusColor(bowser.status)}">${bowser.status}</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary edit-bowser" data-id="${bowser.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-bowser" data-id="${bowser.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }

            // Update users table
            const usersTable = document.getElementById('usersTable').getElementsByTagName('tbody')[0];
            if (usersTable) {
                usersTable.innerHTML = users.map(user => `
                    <tr>
                        <td>${user.username}</td>
                        <td>${user.role}</td>
                        <td><span class="badge bg-${this.getStatusColor(user.status)}">${user.status}</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary edit-user" data-id="${user.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger delete-user" data-id="${user.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }

            console.log('Tables updated successfully');
        } catch (error) {
            console.error('Error updating tables:', error);
        }
    }

    getStatusColor(status) {
        const colors = {
            'active': 'success',
            'pending': 'warning',
            'inactive': 'danger',
            'deployed': 'primary',
            'maintenance': 'warning',
            'outOfService': 'danger',
            'available': 'success'
        };
        return colors[status] || 'secondary';
    }

    /**
     * Update alerts list
     */
    updateAlerts() {
        const alertsListElement = document.getElementById('alertsList');
        if (!alertsListElement) return;
        
        const alerts = this.dataManager.getActiveAlerts();
        
        if (alerts.length === 0) {
            alertsListElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-bell-slash"></i>
                    <p>No recent alerts</p>
                </div>
            `;
            return;
        }
        
        alertsListElement.innerHTML = '';
        alerts.forEach(alert => {
            const location = this.dataManager.getLocationById(alert.locationId);
            const alertItem = document.createElement('div');
            alertItem.className = `alert-item priority-${alert.priority}`;
            alertItem.innerHTML = `
                <div class="alert-header">
                    <span class="alert-title">${location ? location.name : 'Unknown Location'}</span>
                    <span class="alert-time">${this.formatDate(alert.createdAt)}</span>
                </div>
                <div class="alert-body">
                    ${alert.message}
                </div>
            `;
            alertsListElement.appendChild(alertItem);
        });
    }
    
    /**
     * Update schedule
     */
    updateSchedule() {
        const scheduleListElement = document.getElementById('scheduleList');
        if (!scheduleListElement) return;
        
        // Get today's maintenance tasks
        const today = new Date().toISOString().split('T')[0];
        const maintenanceItems = this.dataManager.data.maintenance || [];
        const todayMaintenance = maintenanceItems.filter(m => 
            m.scheduledDate === today && m.status !== 'completed'
        );
        
        // If no scheduled activities
        if (todayMaintenance.length === 0) {
            scheduleListElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-check"></i>
                    <p>No scheduled activities today</p>
                </div>
            `;
            return;
        }
        
        // Add schedule items
        scheduleListElement.innerHTML = '';
        todayMaintenance.forEach(maintenance => {
            const bowser = this.dataManager.getBowserById(maintenance.bowserId);
            const scheduleItem = document.createElement('div');
            scheduleItem.className = 'schedule-item';
            scheduleItem.innerHTML = `
                <div class="schedule-info">
                    <span class="schedule-title">${maintenance.type} - ${bowser ? bowser.number : 'Unknown Bowser'}</span>
                    <span class="schedule-status ${maintenance.status}">${maintenance.status}</span>
                </div>
                <div class="schedule-description">
                    ${maintenance.description}
                </div>
            `;
            scheduleListElement.appendChild(scheduleItem);
        });
    }
    
    /**
     * Set up refresh intervals
     */
    startRefreshInterval() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => this.updateDashboard(), 30000);
    }
    
    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, danger, etc)
     */
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        
        if (notification && notificationText) {
            notificationText.textContent = message;
            notification.className = `notification ${type}`;
            notification.style.display = 'block';
            
            // Hide after 3 seconds
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }
    }
    
    /**
     * Format date
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date
     */
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        return date.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Set up event listeners for dashboard buttons
     */
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.handleRefresh());
        }

        // View all activity button
        const viewAllActivityBtn = document.getElementById('viewAllActivity');
        if (viewAllActivityBtn) {
            viewAllActivityBtn.addEventListener('click', () => this.handleViewAllActivity());
        }

        // View toggle buttons
        const viewToggleBtns = document.querySelectorAll('[data-view]');
        viewToggleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleViewToggle(e));
        });

        // Add Location button
        const addLocationBtn = document.getElementById('addLocationBtn');
        if (addLocationBtn) {
            addLocationBtn.addEventListener('click', () => {
                const modal = new bootstrap.Modal(document.getElementById('locationModal'));
                modal.show();
            });
        }

        // Add Bowser button
        const addBowserBtn = document.getElementById('addBowserBtn');
        if (addBowserBtn) {
            addBowserBtn.addEventListener('click', () => {
                const modal = new bootstrap.Modal(document.getElementById('bowserModal'));
                modal.show();
            });
        }

        // Add User button
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => {
                const modal = new bootstrap.Modal(document.getElementById('userModal'));
                modal.show();
            });
        }

        // Save buttons
        const saveLocationBtn = document.getElementById('saveLocation');
        if (saveLocationBtn) {
            saveLocationBtn.addEventListener('click', () => this.handleSaveLocation());
        }

        const saveBowserBtn = document.getElementById('saveBowser');
        if (saveBowserBtn) {
            saveBowserBtn.addEventListener('click', () => this.handleSaveBowser());
        }

        const saveUserBtn = document.getElementById('saveUser');
        if (saveUserBtn) {
            saveUserBtn.addEventListener('click', () => this.handleSaveUser());
        }
    }

    /**
     * Handle refresh button click
     */
    async handleRefresh() {
        try {
            this.showNotification('Refreshing dashboard data...', 'info');
            await this.dataManager.refreshData();
            this.updateDashboard();
            this.showNotification('Dashboard refreshed successfully', 'success');
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
            this.showNotification('Error refreshing dashboard data', 'danger');
        }
    }

    /**
     * Handle view all activity button click
     */
    handleViewAllActivity() {
        // Redirect to activity log page
        window.location.href = '/activity';
    }

    /**
     * Handle map/list view toggle
     */
    handleViewToggle(event) {
        const view = event.currentTarget.dataset.view;
        const mapContainer = document.getElementById('map');
        const listContainer = document.getElementById('bowserList');
        
        // Update button states
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Toggle visibility
        if (view === 'map') {
            mapContainer.style.display = 'block';
            if (listContainer) listContainer.style.display = 'none';
            this.map.invalidateSize(); // Refresh map size
        } else {
            mapContainer.style.display = 'none';
            if (listContainer) listContainer.style.display = 'block';
        }
    }

    async handleSaveLocation() {
        const form = document.getElementById('locationForm');
        const newLocation = {
            name: form.querySelector('#locationName').value,
            type: form.querySelector('#locationType').value,
            latitude: parseFloat(form.querySelector('#locationLat').value),
            longitude: parseFloat(form.querySelector('#locationLng').value),
            status: 'active'
        };

        try {
            const response = await fetch('/api/locations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newLocation)
            });

            if (!response.ok) {
                throw new Error('Failed to add location');
            }

            const result = await response.json();
            await this.updateDashboard();
            const modal = bootstrap.Modal.getInstance(document.getElementById('locationModal'));
            modal.hide();
            form.reset();
            this.showNotification('Location added successfully', 'success');
        } catch (error) {
            console.error('Error adding location:', error);
            this.showNotification('Error adding location: ' + error.message, 'error');
        }
    }

    async handleSaveBowser() {
        const form = document.getElementById('bowserForm');
        const newBowser = {
            number: form.querySelector('#bowserNumber').value,
            capacity: parseFloat(form.querySelector('#bowserCapacity').value),
            status: form.querySelector('#bowserStatus').value
        };

        try {
            const response = await fetch('/api/bowsers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newBowser)
            });

            if (!response.ok) {
                throw new Error('Failed to add bowser');
            }

            const result = await response.json();
            await this.updateDashboard();
            const modal = bootstrap.Modal.getInstance(document.getElementById('bowserModal'));
            modal.hide();
            form.reset();
            this.showNotification('Bowser added successfully', 'success');
        } catch (error) {
            console.error('Error adding bowser:', error);
            this.showNotification('Error adding bowser: ' + error.message, 'error');
        }
    }

    async handleSaveUser() {
        const form = document.getElementById('userForm');
        const newUser = {
            username: form.querySelector('#username').value,
            role: form.querySelector('#userRole').value,
            password: form.querySelector('#password').value
        };

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newUser)
            });

            if (!response.ok) {
                throw new Error('Failed to add user');
            }

            const result = await response.json();
            await this.updateDashboard();
            const modal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
            modal.hide();
            form.reset();
            this.showNotification('User added successfully', 'success');
        } catch (error) {
            console.error('Error adding user:', error);
            this.showNotification('Error adding user: ' + error.message, 'error');
        }
    }

    /**
     * Populate active deployments table
     */
    async updateDeploymentsTable() {
        try {
            const deployments = this.dataManager.getActiveDeployments();
            const locations = this.dataManager.getLocations();
            const bowsers = this.dataManager.getBowsers();
            const tbody = document.querySelector('#deploymentsTable tbody');
            if (!tbody) return;
            tbody.innerHTML = deployments.map(dep => {
                const loc = locations.find(l => l.id === dep.location_id) || {};
                const bowser = bowsers.find(b => b.id === dep.bowser_id) || {};
                // Compute supply level percentage if current_level and capacity available
                let supply = 'N/A';
                if (bowser.current_level !== undefined && bowser.capacity) {
                    supply = `${Math.round((bowser.current_level / bowser.capacity) * 100)}%`;
                }
                const address = loc.address || '';
                const postcode = this.extractPostcode(address) || '';
                return `
                    <tr>
                        <td>${loc.name || ''}</td>
                        <td>${bowser.number || ''}</td>
                        <td>${supply}</td>
                        <td>${address}</td>
                        <td>${postcode}</td>
                    </tr>`;
            }).join('');
        } catch (error) {
            console.error('Error updating deployments table:', error);
            this.showNotification('Error updating deployments table', 'error');
        }
    }
}

// Initialize dashboard
const dashboard = new Dashboard();
