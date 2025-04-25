/**
 * Database handler for the AquaAlert application
 * Uses Flask API endpoints for database operations
 * Supports both module and non-module usage patterns
 */

export class DBHandler {
    constructor() {
        this.baseUrl = '/api';
        this.data = {
            bowsers: [],
            locations: [],
            maintenance: [],
            deployments: [],
            users: [],
            alerts: []
        };
        this.dataLoaded = false;
        // Set to false to use real API endpoints
        this.useMockData = false;
        
        // Don't initialize data in constructor
        // Let the consumer call initializeData() when ready
    }

    /**
     * Initialize data by loading from API
     */
    async initializeData() {
        try {
            console.log('Initializing DBHandler data...');
            const [bowsers, locations, maintenance, deployments, users, alerts] = await Promise.all([
                this.loadBowsers(),
                this.loadLocations(),
                this.loadMaintenance(),
                this.loadDeployments(),
                this.loadUsers(),
                this.loadAlerts()
            ]);

            this.data = {
                bowsers: bowsers || [],
                locations: locations || [],
                maintenance: maintenance || [],
                deployments: deployments || [],
                users: users || [],
                alerts: alerts || []
            };

            this.dataLoaded = true;
            console.log('DBHandler data initialized successfully:', this.data);
            return this.data;
        } catch (error) {
            console.error('Error initializing DBHandler data:', error);
            throw error;
        }
    }

    /**
     * Load bowsers from API
     */
    async loadBowsers() {
        try {
            console.log('Loading bowsers from API...');
            const response = await this.request('/bowsers');
            // Handle both array and { data: [...] } formats
            const data = Array.isArray(response) ? response : response.data;
            console.log('Bowsers loaded successfully:', data);
            return data;
        } catch (error) {
            console.error('Error loading bowsers:', error);
            return [];
        }
    }

    /**
     * Load locations from API
     */
    async loadLocations() {
        try {
            console.log('Loading locations from API...');
            const response = await this.request('/locations');
            const data = Array.isArray(response) ? response : response.data;
            console.log('Locations loaded successfully:', data);
            return data;
        } catch (error) {
            console.error('Error loading locations:', error);
            return [];
        }
    }

    /**
     * Load maintenance records from API
     */
    async loadMaintenance() {
        try {
            console.log('Loading maintenance from API...');
            const response = await this.request('/maintenance');
            const data = Array.isArray(response) ? response : response.data;
            console.log('Maintenance loaded successfully:', data);
            return data;
        } catch (error) {
            console.error('Error loading maintenance:', error);
            return [];
        }
    }

    /**
     * Load deployments from API
     */
    async loadDeployments() {
        try {
            console.log('Loading deployments from API...');
            const response = await this.request('/deployments');
            const data = Array.isArray(response) ? response : response.data;
            console.log('Deployments loaded successfully:', data);
            return data;
        } catch (error) {
            console.error('Error loading deployments:', error);
            return [];
        }
    }

    /**
     * Load users from API
     */
    async loadUsers() {
        try {
            console.log('Loading users from API...');
            const response = await this.request('/users');
            const data = Array.isArray(response) ? response : response.data;
            console.log('Users loaded successfully:', data);
            return data;
        } catch (error) {
            console.error('Error loading users:', error);
            return [];
        }
    }

    /**
     * Load alerts from API
     */
    async loadAlerts() {
        try {
            console.log('Loading alerts from API...');
            const response = await this.request('/alerts');
            const data = Array.isArray(response) ? response : response.data;
            console.log('Alerts loaded successfully:', data);
            return data;
        } catch (error) {
            console.error('Error loading alerts:', error);
            return [];
        }
    }

    /**
     * Get all bowsers
     * @returns {Array} Array of bowsers
     */
    async getBowsers() {
        if (!this.dataLoaded) {
            return this.loadBowsers();
        }
        return this.data.bowsers || [];
    }

    /**
     * Get bowser by ID
     * @param {string} id Bowser ID
     * @returns {Object} Bowser object
     */
    async getBowser(id) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        return this.data.bowsers.find(bowser => bowser.id === id);
    }

    /**
     * Add a new bowser
     * @param {Object} bowser Bowser object
     * @returns {Object} Added bowser with generated ID
     */
    async createBowser(bowser) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/bowsers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bowser)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to add bowser: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            // Add to local cache
            if (!bowser.id) {
                bowser.id = result.id;
            }
            this.data.bowsers.push(bowser);
            
            return bowser;
        } catch (error) {
            console.error('Error adding bowser:', error);
            throw error;
        }
    }

    /**
     * Update a bowser
     * @param {string} id Bowser ID
     * @param {Object} updatedData Updated bowser data
     * @returns {Object} Updated bowser
     */
    async updateBowser(id, updatedData) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/bowsers/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to update bowser: ${response.statusText}`);
            }
            
            // Update local cache
            const index = this.data.bowsers.findIndex(bowser => bowser.id == id);
            if (index !== -1) {
                this.data.bowsers[index] = { ...this.data.bowsers[index], ...updatedData };
            }
            
            return this.data.bowsers[index];
        } catch (error) {
            console.error('Error updating bowser:', error);
            throw error;
        }
    }

    /**
     * Delete a bowser
     * @param {string} id Bowser ID
     * @returns {boolean} True if deleted successfully
     */
    async deleteBowser(id) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/bowsers/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete bowser: ${response.statusText}`);
            }
            
            // Update local cache
            const index = this.data.bowsers.findIndex(bowser => bowser.id == id);
            if (index !== -1) {
                this.data.bowsers.splice(index, 1);
            }
            
            return true;
        } catch (error) {
            console.error('Error deleting bowser:', error);
            throw error;
        }
    }

    /**
     * Get all locations
     * @returns {Array} Array of locations
     */
    async getLocations() {
        if (!this.dataLoaded) {
            return this.loadLocations();
        }
        return this.data.locations || [];
    }

    /**
     * Get location by ID
     * @param {string} id Location ID
     * @returns {Object} Location object
     */
    async getLocation(id) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        try {
            // Try to fetch from API first
            const response = await fetch(`${this.baseUrl}/locations/${id}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn(`Error fetching location ${id}:`, error);
        }
        
        // Fallback to local cache
        return this.data.locations.find(location => location.id === id);
    }

    /**
     * Add a new location
     * @param {Object} location Location object
     * @returns {Object} Added location with generated ID
     */
    async createLocation(location) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/locations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(location)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to add location: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            // Add to local cache
            if (!location.id) {
                location.id = result.id;
            }
            this.data.locations.push(location);
            
            return location;
        } catch (error) {
            console.error('Error adding location:', error);
            throw error;
        }
    }

    /**
     * Update a location
     * @param {string} id Location ID
     * @param {Object} updatedData Updated location data
     * @returns {Object} Updated location
     */
    async updateLocation(id, updatedData) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/locations/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to update location: ${response.statusText}`);
            }
            
            // Update local cache
            const index = this.data.locations.findIndex(location => location.id == id);
            if (index !== -1) {
                this.data.locations[index] = { ...this.data.locations[index], ...updatedData };
            }
            
            return this.data.locations[index];
        } catch (error) {
            console.error('Error updating location:', error);
            throw error;
        }
    }

    /**
     * Delete a location
     * @param {string} id Location ID
     * @returns {boolean} True if deleted successfully
     */
    async deleteLocation(id) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/locations/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete location: ${response.statusText}`);
            }
            
            // Update local cache
            const index = this.data.locations.findIndex(location => location.id == id);
            if (index !== -1) {
                this.data.locations.splice(index, 1);
            }
            
            return true;
        } catch (error) {
            console.error('Error deleting location:', error);
            throw error;
        }
    }

    /**
     * Get all maintenance records
     * @returns {Array} Array of maintenance records
     */
    async getMaintenance() {
        if (!this.dataLoaded) {
            return this.loadMaintenance();
        }
        return this.data.maintenance || [];
    }

    /**
     * Get maintenance records for a specific bowser
     * @param {string} bowserId Bowser ID
     * @returns {Array} Array of maintenance records
     */
    async getMaintenanceRecordsByBowserId(bowserId) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        return this.data.maintenance.filter(record => record.bowserId === bowserId);
    }
    
    /**
     * Get maintenance record by ID
     * @param {string} id Maintenance record ID
     * @returns {Object} Maintenance record object
     */
    async getMaintenanceRecordById(id) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        try {
            // Try to fetch from API first
            const response = await fetch(`${this.baseUrl}/maintenance/${id}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.warn(`Error fetching maintenance record ${id}:`, error);
        }
        
        // Fallback to local cache
        return this.data.maintenance.find(record => record.id === id);
    }
    
    /**
     * Update a maintenance record
     * @param {string} id Maintenance record ID
     * @param {Object} updatedData Updated maintenance record data
     * @returns {Object} Updated maintenance record
     */
    async updateMaintenance(id, updatedData) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/maintenance/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to update maintenance record: ${response.statusText}`);
            }
            
            // Update local cache
            const index = this.data.maintenance.findIndex(record => record.id === id);
            if (index !== -1) {
                this.data.maintenance[index] = { ...this.data.maintenance[index], ...updatedData };
            }
            
            return this.data.maintenance[index];
        } catch (error) {
            console.error('Error updating maintenance record:', error);
            throw error;
        }
    }
    
    /**
     * Delete a maintenance record
     * @param {string} id Maintenance record ID
     * @returns {boolean} True if deleted successfully
     */
    async deleteMaintenance(id) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/maintenance/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete maintenance record: ${response.statusText}`);
            }
            
            // Remove from local cache
            this.data.maintenance = this.data.maintenance.filter(record => record.id !== id);
            
            return true;
        } catch (error) {
            console.error('Error deleting maintenance record:', error);
            throw error;
        }
    }
    
    /**
     * Get all deployments
     * @returns {Array} Array of deployments
     */
    async getDeployments() {
        if (!this.dataLoaded) {
            return this.loadDeployments();
        }
        return this.data.deployments || [];
    }
    
    /**
     * Get deployment for a specific bowser
     * @param {string} bowserId Bowser ID
     * @returns {Object} Deployment object or null if not deployed
     */
    async getDeploymentByBowserId(bowserId) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        try {
            // Try to get deployment from API first
            const response = await fetch(`${this.baseUrl}/deployments`);
            if (response.ok) {
                const deployments = await response.json();
                return deployments.find(dep => dep.bowserId === bowserId);
            }
            
            // Fallback to local cache
            const deployment = this.data.deployments.find(dep => dep.bowserId === bowserId);
            if (deployment) return deployment;
            
            // Try alternative method for legacy data
            const location = this.data.locations.find(loc => loc.bowserId === bowserId && loc.status === 'active');
            
            // If found, create a deployment object
            if (location) {
                return {
                    bowserId: bowserId,
                    locationId: location.id,
                    status: 'active',
                    startDate: new Date().toISOString().split('T')[0] // Placeholder
                };
            }
            
            return null;
        } catch (error) {
            console.warn('Error getting deployment:', error);
            return null;
        }
    }
    
    /**
     * Create a new deployment
     * @param {Object} deployment Deployment object
     * @returns {Object} Created deployment
     */
    async createDeployment(deployment) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        try {
            
            // For real API implementation
            const response = await fetch(`${this.baseUrl}/deployments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(deployment)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to create deployment: ${response.statusText}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error creating deployment:', error);
            throw error;
        }
    }
    
    /**
     * Get all alerts
     * @returns {Array} Array of alerts
     */
    async getAlerts() {
        if (!this.dataLoaded) {
            return this.loadAlerts();
        }
        return this.data.alerts || [];
    }
    
    /**
     * Update an existing deployment
     * @param {string} deploymentId Deployment ID
     * @param {Object} updatedData Updated deployment data
     * @returns {Object} Updated deployment
     */
    async updateDeployment(id, updatedData) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        try {
            // In development mode, update local array
            if (this.useMockData) {
                const index = this.data.deployments.findIndex(d => d.id === id);
                if (index === -1) {
                    throw new Error(`Deployment with ID ${id} not found`);
                }
                
                // Update the deployment with new data
                this.data.deployments[index] = {
                    ...this.data.deployments[index],
                    ...updatedData
                };
                
                return this.data.deployments[index];
            }
            
            // For real API implementation
            const response = await fetch(`${this.baseUrl}/deployments/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to update deployment: ${response.statusText}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error updating deployment:', error);
            throw error;
        }
    }
    
    /**
     * End a deployment
     * @param {string} deploymentId Deployment ID
     * @returns {Object} Updated deployment
     */
    async endDeployment(deploymentId) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        try {
            // Get the deployment
            const deployment = this.data.deployments.find(d => d.id === deploymentId);
            if (!deployment) {
                throw new Error(`Deployment with ID ${deploymentId} not found`);
            }
            
            // Update deployment status
            const endDate = new Date().toISOString().split('T')[0];
            const updatedDeployment = await this.updateDeployment(deploymentId, {
                status: 'completed',
                endDate: endDate
            });
            
            // Update bowser status back to active
            const bowser = this.getBowser(deployment.bowserId);
            if (bowser) {
                bowser.status = 'active';
                await this.updateBowser(bowser.id, bowser);
            }
            
            return updatedDeployment;
        } catch (error) {
            console.error('Error ending deployment:', error);
            throw error;
        }
    }
    


    /**
     * Add a new maintenance record
     * @param {Object} record Maintenance record
     * @returns {Object} Added maintenance record with generated ID
     */
    async createMaintenance(maintenance) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/maintenance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(maintenance)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to add maintenance record: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            // Add to local cache
            if (!maintenance.id) {
                maintenance.id = result.id;
            }
            this.data.maintenance.push(maintenance);
            
            return maintenance;
        } catch (error) {
            console.error('Error adding maintenance record:', error);
            throw error;
        }
    }

    /**
     * Generate a unique ID with a given prefix
     * @param {string} prefix ID prefix
     * @returns {string} Generated ID
     */
    generateId(prefix = '') {
        const timestamp = new Date().getTime();
        const random = Math.floor(Math.random() * 10000);
        return `${prefix}${timestamp}${random}`;
    }

    /**
     * Make an API request
     * @param {string} endpoint - API endpoint
     * @param {string} method - HTTP method
     * @param {Object} data - Request data
     * @returns {Promise} API response
     */
    async request(endpoint, method = 'GET', data = null) {
        try {
            const url = `${this.baseUrl}${endpoint}`;
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                credentials: 'include'
            };

            if (data) {
                options.body = JSON.stringify(data);
            }

            console.log(`Making ${method} request to ${url}`, options);
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log(`Response from ${url}:`, result);

            if (result.status === 'error') {
                throw new Error(result.message);
            }

            return result;
        } catch (error) {
            console.error(`Error in ${method} request to ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Get CSRF token from cookie
     * @returns {string} CSRF token
     */
    getCsrfToken() {
        const token = document.querySelector('meta[name="csrf-token"]');
        return token ? token.getAttribute('content') : '';
    }

    /**
     * Get all users
     * @returns {Array} Array of users
     */
    async getUsers() {
        if (!this.dataLoaded) {
            return this.loadUsers();
        }
        return this.data.users || [];
    }

    /**
     * Get active deployments
     * @returns {Array} Array of active deployments
     */
    async getActiveDeployments() {
        const deployments = await this.getDeployments();
        return Array.isArray(deployments) ? deployments.filter(d => d.status === 'active') : [];
    }
}

// Initialize the database handler
const dbHandler = new DBHandler();

// Support both module (import/export) and non-module (global variable) usage
try {
    if (typeof module !== 'undefined' && module.exports) {
        // Node.js/CommonJS export
        module.exports = dbHandler;
    } else if (typeof define === 'function' && define.amd) {
        // AMD/RequireJS export
        define([], function() { return dbHandler; });
    } else if (typeof window !== 'undefined') {
        // Browser global variable
        window.dbHandler = dbHandler;
    }
} catch (e) {
    console.log('Module export not supported in this environment');
}

// dbHandler is already available as a global variable
