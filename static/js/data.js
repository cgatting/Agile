/**
 * Data management functionality for the AquaAlert application
 */
import { DBHandler } from './db-handler.js';

export class DataManager {
    constructor() {
        this.dbHandler = new DBHandler();
        this.data = {
            locations: [],
            bowsers: [],
            users: [],
            deployments: [],
            maintenance: [],
            alerts: []
        };
    }

    async initializeData() {
        try {
            console.log('Initializing data...');
            await this.dbHandler.initializeData();
            
            // Load all data
            const [locations, bowsers, users, deployments, maintenance, alerts] = await Promise.all([
                this.loadLocations(),
                this.loadBowsers(),
                this.loadUsers(),
                this.loadDeployments(),
                this.loadMaintenance(),
                this.loadAlerts()
            ]);

            // Update local data
            this.data = {
                locations: locations || [],
                bowsers: bowsers || [],
                users: users || [],
                deployments: deployments || [],
                maintenance: maintenance || [],
                alerts: alerts || []
            };

            console.log('Data initialized successfully:', this.data);
            return this.data;
        } catch (error) {
            console.error('Error initializing data:', error);
            throw error;
        }
    }

    async loadLocations() {
        try {
            console.log('Loading locations...');
            const locations = await this.dbHandler.getLocations();
            console.log('Locations loaded:', locations);
            return Array.isArray(locations) ? locations : [];
        } catch (error) {
            console.error('Error loading locations:', error);
            return [];
        }
    }

    async loadBowsers() {
        try {
            console.log('Loading bowsers...');
            const bowsers = await this.dbHandler.getBowsers();
            console.log('Bowsers loaded:', bowsers);
            return Array.isArray(bowsers) ? bowsers : [];
        } catch (error) {
            console.error('Error loading bowsers:', error);
            return [];
        }
    }

    async loadUsers() {
        try {
            console.log('Loading users...');
            const users = await this.dbHandler.getUsers();
            console.log('Users loaded:', users);
            return Array.isArray(users) ? users : [];
        } catch (error) {
            console.error('Error loading users:', error);
            return [];
        }
    }

    async loadDeployments() {
        try {
            console.log('Loading deployments...');
            const deployments = await this.dbHandler.getDeployments();
            console.log('Deployments loaded:', deployments);
            return Array.isArray(deployments) ? deployments : [];
        } catch (error) {
            console.error('Error loading deployments:', error);
            return [];
        }
    }

    async loadMaintenance() {
        try {
            console.log('Loading maintenance...');
            const maintenance = await this.dbHandler.getMaintenance();
            console.log('Maintenance loaded:', maintenance);
            return Array.isArray(maintenance) ? maintenance : [];
        } catch (error) {
            console.error('Error loading maintenance:', error);
            return [];
        }
    }

    async loadAlerts() {
        try {
            console.log('Loading alerts...');
            const alerts = await this.dbHandler.getAlerts();
            console.log('Alerts loaded:', alerts);
            return Array.isArray(alerts) ? alerts : [];
        } catch (error) {
            console.error('Error loading alerts:', error);
            return [];
        }
    }

    // Getter methods
    getLocations() {
        return this.data.locations;
    }

    getBowsers() {
        return this.data.bowsers;
    }

    getUsers() {
        return this.data.users;
    }

    getActiveDeployments() {
        return this.data.deployments.filter(d => d.status === 'active');
    }

    getMaintenanceDue() {
        return this.data.maintenance.filter(m => m.status === 'pending');
    }

    getEmergencyAlerts() {
        return this.data.alerts.filter(a => a.priority === 'high');
    }

    // Refresh data
    async refreshData() {
        await this.initializeData();
    }
}
