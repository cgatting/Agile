/**
 * Reports and analytics functionality for AquaAlert
 */
class ReportsManager {
    constructor() {
        this.charts = {};
        this.dateRange = 7; // Default to 7 days
        this.initializeEventListeners();
        this.loadReportData();
    }

    initializeEventListeners() {
        // Date range selector
        document.getElementById('dateRange').addEventListener('change', (e) => {
            const value = e.target.value;
            document.getElementById('customRange').style.display = 
                value === 'custom' ? 'flex' : 'none';
            if (value !== 'custom') {
                this.dateRange = parseInt(value);
                this.loadReportData();
            }
        });

        // Custom date range
        document.getElementById('applyRange').addEventListener('click', () => {
            const startDate = new Date(document.getElementById('startDate').value);
            const endDate = new Date(document.getElementById('endDate').value);
            if (startDate && endDate) {
                this.dateRange = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                this.loadReportData();
            }
        });

        // Location type filter
        document.getElementById('locationTypeFilter').addEventListener('change', () => {
            this.updateLocationPerformance();
        });

        // Export buttons
        document.querySelectorAll('.export-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.exportReport(btn.dataset.format);
            });
        });
    }

    async loadReportData() {
        try {
            // Fetch data from API
            const [bowsers, deployments, maintenance, reports] = await Promise.all([
                fetch(`${CONFIG.api.base}${CONFIG.api.endpoints.bowsers}`).then(res => res.json()),
                fetch(`${CONFIG.api.base}${CONFIG.api.endpoints.deployments}`).then(res => res.json()),
                fetch(`${CONFIG.api.base}${CONFIG.api.endpoints.maintenance}`).then(res => res.json()),
                fetch(`${CONFIG.api.base}${CONFIG.api.endpoints.reports}`).then(res => res.json())
            ]);
            
            // Store data in dataManager
            dataManager.bowsers = bowsers;
            dataManager.deployments = deployments;
            dataManager.maintenanceRecords = maintenance;
            dataManager.reports = reports;
            
            // Update UI components
            this.updateMetrics();
            this.createUtilizationChart();
            this.createDistributionChart();
            this.createMaintenanceCharts();
            this.updateLocationPerformance();
        } catch (error) {
            this.showNotification('Error loading report data', 'error');
            console.error(error);
        }
    }

    async updateMetrics() {
        let activeBowsers = 0;
        let locationsServed = 0;
        let maintenanceRate = 0;
        let waterSupplied = 0;
        let changes = {
            bowser: '0%',
            location: '0%',
            maintenance: '0%',
            supply: '0%'
        };
        
        try {
            // Get current data
            activeBowsers = dataManager.bowsers.filter(b => b.status === 'active').length;
            const activeDeployments = dataManager.deployments.filter(d => d.status === 'active');
            locationsServed = new Set(activeDeployments.map(d => d.locationId)).size;
            
            const allMaintenance = dataManager.maintenanceRecords;
            const completedMaintenance = allMaintenance.filter(r => r.status === 'completed');
            maintenanceRate = allMaintenance.length ? 
                Math.round((completedMaintenance.length / allMaintenance.length) * 100) : 0;

            // Calculate total water supplied
            waterSupplied = activeDeployments.reduce((total, deployment) => {
                const bowser = dataManager.bowsers.find(b => b.id === deployment.bowserId);
                if (bowser) {
                    const supplyLevel = deployment.supplyLevel || 0;
                    const waterDelivered = bowser.capacity * ((100 - supplyLevel) / 100);
                    return total + waterDelivered;
                }
                return total;
            }, 0);

            // Calculate changes (simplified for demo)
            changes = {
                bowser: activeBowsers > 0 ? '+5%' : '0%',
                location: locationsServed > 0 ? '+12%' : '0%',
                maintenance: maintenanceRate > 0 ? '-2%' : '0%',
                supply: waterSupplied > 0 ? '+8%' : '0%'
            };
        } catch (error) {
            this.showNotification('Error updating metrics', 'error');
            console.error(error);
        }

        // Update DOM with metrics
        document.getElementById('activeBowsers').textContent = activeBowsers;
        document.getElementById('locationsServed').textContent = locationsServed;
        document.getElementById('maintenanceRate').textContent = `${maintenanceRate}%`;
        document.getElementById('waterSupplied').textContent = `${Math.round(waterSupplied).toLocaleString()}L`;

        // Update change indicators
        document.getElementById('bowserChange').textContent = changes.bowser;
        document.getElementById('bowserChange').className = 'metric-change ' + (changes.bowser.startsWith('+') ? 'positive' : 'negative');
        
        document.getElementById('locationChange').textContent = changes.location;
        document.getElementById('locationChange').className = 'metric-change ' + (changes.location.startsWith('+') ? 'positive' : 'negative');
        
        document.getElementById('maintenanceChange').textContent = changes.maintenance;
        document.getElementById('maintenanceChange').className = 'metric-change ' + (changes.maintenance.startsWith('+') ? 'positive' : 'negative');
        
        document.getElementById('supplyChange').textContent = changes.supply;
        document.getElementById('supplyChange').className = 'metric-change ' + (changes.supply.startsWith('+') ? 'positive' : 'negative');
    }

    createUtilizationChart() {

    createUtilizationChart() {
        const ctx = document.getElementById('utilizationChart').getContext('2d');
        
        // Calculate utilization data
        const bowserStatuses = ['deployed', 'maintenance', 'standby', 'decommissioned'];
        const bowserData = bowserStatuses.reduce((acc, status) => {
            const count = dataManager.getBowsersByStatus(status).length;
            if (count > 0) {
                acc.labels.push(status.charAt(0).toUpperCase() + status.slice(1));
                acc.data.push(count);
            }
            return acc;
        }, { labels: [], data: [] });

        if (this.charts.utilization) {
            this.charts.utilization.destroy();
        }

        this.charts.utilization = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: bowserData.labels,
                datasets: [{
                    data: bowserData.data,
                    backgroundColor: [
                        '#4caf50',  // Deployed
                        '#ff9800',  // Maintenance
                        '#2196f3',  // Standby
                        '#f44336'   // Decommissioned
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });;
    }

    createDistributionChart() {
        const ctx = document.getElementById('distributionChart').getContext('2d');
        
        // Calculate distribution data
        const locationTypes = ['healthcare', 'emergency', 'residential', 'commercial'];
        const distributionData = locationTypes.map(type => {
            const locations = dataManager.getLocationsByType(type);
            const deploymentCount = locations.reduce((count, location) => {
                return count + dataManager.getDeploymentsByLocation(location.id).length;
            }, 0);
            return deploymentCount;
        });

        if (this.charts.distribution) {
            this.charts.distribution.destroy();
        }

        this.charts.distribution = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: locationTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1)),
                datasets: [{
                    label: 'Active Deployments',
                    data: distributionData,
                    backgroundColor: '#2196f3'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });;
    }

    createMaintenanceCharts() {
        // Maintenance by Type chart
        const typeCtx = document.getElementById('maintenanceTypeChart').getContext('2d');
        const maintenanceRecords = dataManager.getActiveMaintenance();
        const maintenanceTypes = maintenanceRecords.reduce((acc, record) => {
            const type = record.type.charAt(0).toUpperCase() + record.type.slice(1);
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        if (this.charts.maintenanceType) {
            this.charts.maintenanceType.destroy();
        }

        const typeColors = {
            'Scheduled': '#4caf50',
            'Emergency': '#f44336',
            'Repair': '#ff9800',
            'Inspection': '#2196f3'
        };

        this.charts.maintenanceType = new Chart(typeCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(maintenanceTypes),
                datasets: [{
                    data: Object.values(maintenanceTypes),
                    backgroundColor: Object.keys(maintenanceTypes).map(type => typeColors[type] || '#9e9e9e')
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Maintenance by Type'
                    }
                }
            }
        });;

        // Response Time Trends chart
        const timeCtx = document.getElementById('responseTimeChart').getContext('2d');
        const responseTimeData = this.calculateResponseTimeTrends();

        if (this.charts.responseTime) {
            this.charts.responseTime.destroy();
        }

        this.charts.responseTime = new Chart(timeCtx, {
            type: 'line',
            data: {
                labels: responseTimeData.labels,
                datasets: [{
                    label: 'Average Response Time (hours)',
                    data: responseTimeData.data,
                    borderColor: '#2196f3',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Hours'
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Maintenance Response Time Trends'
                    }
                }
            }
        });;
    }

    calculateResponseTimeTrends() {
        const maintenanceRecords = dataManager.getActiveMaintenance();
        const now = new Date();
        const days = Array.from({ length: this.dateRange }, (_, i) => {
            const date = new Date(now);
            date.setDate(date.getDate() - (this.dateRange - 1 - i));
            return date;
        });

        // Calculate average response time for each day
        const data = days.map(day => {
            const dayRecords = maintenanceRecords.filter(record => {
                const recordDate = new Date(record.scheduledDate);
                return recordDate.toDateString() === day.toDateString();
            });

            if (dayRecords.length === 0) return 0;

            const totalResponseTime = dayRecords.reduce((sum, record) => {
                const scheduledDate = new Date(record.scheduledDate);
                const completedDate = record.estimatedCompletion ? new Date(record.estimatedCompletion) : now;
                return sum + (completedDate - scheduledDate) / (1000 * 60 * 60); // Convert to hours
            }, 0);

            return Math.round(totalResponseTime / dayRecords.length);
        });

        return {
            labels: days.map(day => day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
            data
        };
    }

    updateLocationPerformance() {
        const tableBody = document.getElementById('performanceTableBody');
        const selectedType = document.getElementById('locationTypeFilter').value;
        
        // Get locations based on filter
        const locations = selectedType === 'all' ? 
            dataManager.getLocations() : 
            dataManager.getLocationsByType(selectedType);

        // Clear existing rows
        tableBody.innerHTML = '';

        // Add location rows
        locations.forEach(location => {
            const deployments = dataManager.getDeploymentsByLocation(location.id);
            const activeDeployments = deployments.filter(d => d.status === 'active');
            const alerts = dataManager.getAlertsByLocation(location.id);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${location.name}</td>
                <td>${location.type.charAt(0).toUpperCase() + location.type.slice(1)}</td>
                <td>${activeDeployments.length}</td>
                <td>${this.calculateSupplyLevel(activeDeployments)}%</td>
                <td>${this.calculateRefillRate(deployments)}/day</td>
                <td>${alerts.length}</td>
            `;
            tableBody.appendChild(row);
        });

        // Update location type filter options
        const typeFilter = document.getElementById('locationTypeFilter');
        typeFilter.innerHTML = `
            <option value="all">All Types</option>
            <option value="healthcare">Healthcare</option>
            <option value="emergency">Emergency</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
        `;;
    }

    calculateSupplyLevel(deployments) {
        if (deployments.length === 0) return 0;
        
        const totalLevel = deployments.reduce((sum, deployment) => {
            return sum + (deployment.supplyLevel || 0);
        }, 0);
        
        return Math.round(totalLevel / deployments.length);;
    }

    calculateRefillRate(deployments) {
        // This would normally calculate based on historical refill data
        // For now, return a mock value between 1-3
        return ((deployments.length % 3) + 1).toFixed(1);;
    }

    exportReport(format) {
        // This would normally handle the export functionality
        this.showNotification(`Report exported as ${format.toUpperCase()}`, 'success');;
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

// Initialize reports manager when the page loads
let reportsManager;
document.addEventListener('DOMContentLoaded', () => {
    reportsManager = new ReportsManager();
});
