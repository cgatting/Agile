/**
 * Data management functionality for the AquaAlert application
 */
class DataManager {
    constructor() {
        // Initialize with data from the server if available
        const initialData = window.INITIAL_DATA || {
            locations: [],
            bowsers: [],
            deployments: [],
            alerts: [],
            maintenance: [],
            users: []
        };
        
        this.data = {
            locations: initialData.locations || [],
            bowsers: initialData.bowsers || [],
            deployments: initialData.deployments || [],
            alerts: initialData.alerts || [],
            maintenance: initialData.maintenance || [],
            users: initialData.users || []
        };
    }

    async initializeData() {
        // If the server injected INITIAL_DATA (public page), use it directly
        if (window.INITIAL_DATA && Array.isArray(window.INITIAL_DATA.locations)) {
            console.log('Using INITIAL_DATA from server');
            this.data = {
                locations: window.INITIAL_DATA.locations,
                bowsers: window.INITIAL_DATA.bowsers,
                deployments: window.INITIAL_DATA.deployments,
                alerts: window.INITIAL_DATA.alerts,
                maintenance: window.INITIAL_DATA.maintenance,
                users: window.INITIAL_DATA.users
            };
            return this.data;
        }
        // Otherwise fetch the latest data from API endpoints
        console.log('Fetching public data from API');
        try {
            // Fetch locations, bowsers, deployments, alerts, and maintenance
            const [locRes, bowRes, depRes, alertRes, maintRes] = await Promise.all([
                fetch('/api/locations'),
                fetch('/api/bowsers'),
                fetch('/api/deployments'),
                fetch('/api/alerts'),
                fetch('/api/maintenance')
            ]);
            
            let locationsData = await locRes.json();
            if (locationsData.data) locationsData = locationsData.data;
            let bowsersData = await bowRes.json();
            if (bowsersData.data) bowsersData = bowsersData.data;
            let deploymentsData = await depRes.json();
            if (deploymentsData.data) deploymentsData = deploymentsData.data;
            let alertsData = await alertRes.json();
            if (alertsData.data) alertsData = alertsData.data;
            // Parse maintenance data
            let maintenanceData = await maintRes.json();
            if (maintenanceData.data) maintenanceData = maintenanceData.data;
            this.data = {
                locations: locationsData,
                bowsers: bowsersData,
                deployments: deploymentsData,
                alerts: alertsData,
                maintenance: maintenanceData,
                users: this.data.users
            };
            console.log('Public data loaded:', this.data);
            return this.data;
        } catch (error) {
            console.error('Error loading public data:', error);
            return this.data;
        }
    }

    // Getter methods
    getLocations() {
        return this.data.locations;
    }

    getBowsers() {
        return this.data.bowsers;
    }

    getActiveDeployments() {
        return this.data.deployments;
    }

    getEmergencyAlerts() {
        return this.data.alerts;
    }

    // Methods to support dashboard stats and tables
    getMaintenanceDue() {
        return this.data.maintenance || [];
    }

    getUsers() {
        return this.data.users || [];
    }

    // Refresh data - in a real application, this would make API calls
    async refreshData() {
        console.log('Refreshing data would require API calls');
        return this.data;
    }
}

// Expose DataManager and default instance globally
window.DataManager = DataManager;
const dataManager = new DataManager();
// Make dataManager globally available for non-module scripts
window.dataManager = dataManager;

