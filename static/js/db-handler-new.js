/**
 * Database handler for the AquaAlert application
 * Uses localStorage for data persistence
 */

class DatabaseHandler {
    constructor() {
        this.data = null;
        this.dataLoaded = false;
        this.DB_KEY = 'aquaalert_db';
    }

    /**
     * Load data from localStorage or initialize with sample data
     * @returns {Promise} Promise that resolves when data is loaded
     */
    async loadData() {
        try {
            // Try to load from localStorage first
            const storedData = localStorage.getItem(this.DB_KEY);
            
            if (storedData) {
                this.data = JSON.parse(storedData);
            } else {
                // If no data in localStorage, load sample data
                await this.loadSampleData();
            }
            
            this.dataLoaded = true;
            console.log('Database loaded successfully');
            return this.data;
        } catch (error) {
            console.error('Error loading database:', error);
            throw error;
        }
    }
    
    /**
     * Load sample data for initial setup
     * @returns {Promise} Promise that resolves when sample data is loaded
     */
    async loadSampleData() {
        try {
            // Sample data structure
            this.data = {
                bowsers: [
                    {
                        id: "BWR001",
                        number: "WB-2025-001",
                        capacity: 5000,
                        currentLevel: 4500,
                        status: "active",
                        manufacturer: "AquaSystem",
                        model: "AS-5000",
                        lastMaintenance: "2025-04-01",
                        nextMaintenance: "2025-06-01",
                        owner: "Region North",
                        notes: "Regular maintenance completed"
                    },
                    {
                        id: "BWR002",
                        number: "WB-2025-002",
                        capacity: 7500,
                        currentLevel: 7000,
                        status: "deployed",
                        manufacturer: "HydraTech",
                        model: "HT-7500",
                        lastMaintenance: "2025-03-01",
                        nextMaintenance: "2025-05-01",
                        owner: "Region East",
                        notes: "Deployed to Riverside Community Center"
                    },
                    {
                        id: "BWR003",
                        number: "WB-2025-003",
                        capacity: 5000,
                        currentLevel: 2500,
                        status: "maintenance",
                        manufacturer: "AquaSystem",
                        model: "AS-5000",
                        lastMaintenance: "2025-03-10",
                        nextMaintenance: "2025-05-10",
                        owner: "Region West",
                        notes: "Pump needs replacement"
                    },
                    {
                        id: "BWR004",
                        number: "WB-2025-004",
                        capacity: 10000,
                        currentLevel: 9500,
                        status: "standby",
                        manufacturer: "HydraTech",
                        model: "HT-10000",
                        lastMaintenance: "2025-03-05",
                        nextMaintenance: "2025-05-05",
                        owner: "Region South",
                        notes: "Ready for emergency deployment"
                    }
                ],
                locations: [
                    {
                        id: "LOC001",
                        name: "Riverside Community Center",
                        address: "123 Riverside Lane, Rivertown",
                        coordinates: {
                            lat: 51.5074,
                            lng: -0.1278
                        },
                        type: "community",
                        status: "active",
                        bowserId: "BWR002"
                    },
                    {
                        id: "LOC002",
                        name: "Hillside Hospital",
                        address: "456 Hospital Road, Hillside",
                        coordinates: {
                            lat: 51.5214,
                            lng: -0.1419
                        },
                        type: "hospital",
                        status: "standby",
                        bowserId: null
                    },
                    {
                        id: "LOC003",
                        name: "Eastside School",
                        address: "789 School Street, Eastside",
                        coordinates: {
                            lat: 51.5315,
                            lng: -0.1210
                        },
                        type: "school",
                        status: "inactive",
                        bowserId: null
                    }
                ],
                maintenance: [
                    {
                        id: "MNT001",
                        bowserId: "BWR001",
                        date: "2025-04-01",
                        type: "routine",
                        description: "Regular maintenance check",
                        technician: "John Smith",
                        cost: 250,
                        status: "completed"
                    },
                    {
                        id: "MNT002",
                        bowserId: "BWR003",
                        date: "2025-03-10",
                        type: "repair",
                        description: "Pump malfunction",
                        technician: "Sarah Johnson",
                        cost: 750,
                        status: "in-progress"
                    },
                    {
                        id: "MNT003",
                        bowserId: "BWR002",
                        date: "2025-03-01",
                        type: "routine",
                        description: "Regular maintenance check",
                        technician: "John Smith",
                        cost: 250,
                        status: "completed"
                    }
                ]
            };
            
            // Save to localStorage
            await this.saveData();
            return this.data;
        } catch (error) {
            console.error('Error loading sample data:', error);
            throw error;
        }
    }

    /**
     * Save data to localStorage
     * @returns {Promise} Promise that resolves when data is saved
     */
    async saveData() {
        try {
            localStorage.setItem(this.DB_KEY, JSON.stringify(this.data));
            console.log('Database saved successfully');
            return true;
        } catch (error) {
            console.error('Error saving database:', error);
            throw error;
        }
    }

    /**
     * Get all bowsers
     * @returns {Array} Array of bowser objects
     */
    getBowsers() {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        return this.data.bowsers || [];
    }

    /**
     * Get a bowser by ID
     * @param {string} id - Bowser ID
     * @returns {Object|null} Bowser object or null if not found
     */
    getBowserById(id) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        return this.data.bowsers.find(bowser => bowser.id === id) || null;
    }

    /**
     * Add a new bowser
     * @param {Object} bowser - Bowser object
     * @returns {Object} Added bowser with ID
     */
    async addBowser(bowser) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        // Generate a new ID if not provided
        if (!bowser.id) {
            const lastId = this.data.bowsers.length > 0 
                ? parseInt(this.data.bowsers[this.data.bowsers.length - 1].id.replace('BWR', '')) 
                : 0;
            bowser.id = `BWR${String(lastId + 1).padStart(3, '0')}`;
        }
        
        this.data.bowsers.push(bowser);
        await this.saveData();
        return bowser;
    }

    /**
     * Update a bowser
     * @param {string} id - Bowser ID
     * @param {Object} updates - Object with properties to update
     * @returns {Object|null} Updated bowser or null if not found
     */
    async updateBowser(id, updates) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        const index = this.data.bowsers.findIndex(bowser => bowser.id === id);
        if (index === -1) {
            return null;
        }
        
        // Update the bowser
        this.data.bowsers[index] = { ...this.data.bowsers[index], ...updates };
        await this.saveData();
        return this.data.bowsers[index];
    }

    /**
     * Delete a bowser
     * @param {string} id - Bowser ID
     * @returns {boolean} True if deleted, false if not found
     */
    async deleteBowser(id) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        const initialLength = this.data.bowsers.length;
        this.data.bowsers = this.data.bowsers.filter(bowser => bowser.id !== id);
        
        // If a bowser was deleted
        if (initialLength !== this.data.bowsers.length) {
            // Also update any locations that referenced this bowser
            this.data.locations.forEach(location => {
                if (location.bowserId === id) {
                    location.bowserId = null;
                }
            });
            
            await this.saveData();
            return true;
        }
        
        return false;
    }

    /**
     * Get all locations
     * @returns {Array} Array of location objects
     */
    getLocations() {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        return this.data.locations || [];
    }

    /**
     * Get a location by ID
     * @param {string} id - Location ID
     * @returns {Object|null} Location object or null if not found
     */
    getLocationById(id) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        return this.data.locations.find(location => location.id === id) || null;
    }

    /**
     * Add a new location
     * @param {Object} location - Location object
     * @returns {Object} Added location with ID
     */
    async addLocation(location) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        // Generate a new ID if not provided
        if (!location.id) {
            const lastId = this.data.locations.length > 0 
                ? parseInt(this.data.locations[this.data.locations.length - 1].id.replace('LOC', '')) 
                : 0;
            location.id = `LOC${String(lastId + 1).padStart(3, '0')}`;
        }
        
        this.data.locations.push(location);
        await this.saveData();
        return location;
    }

    /**
     * Update a location
     * @param {string} id - Location ID
     * @param {Object} updates - Object with properties to update
     * @returns {Object|null} Updated location or null if not found
     */
    async updateLocation(id, updates) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        const index = this.data.locations.findIndex(location => location.id === id);
        if (index === -1) {
            return null;
        }
        
        // Update the location
        this.data.locations[index] = { ...this.data.locations[index], ...updates };
        await this.saveData();
        return this.data.locations[index];
    }

    /**
     * Delete a location
     * @param {string} id - Location ID
     * @returns {boolean} True if deleted, false if not found
     */
    async deleteLocation(id) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        const initialLength = this.data.locations.length;
        this.data.locations = this.data.locations.filter(location => location.id !== id);
        
        if (initialLength !== this.data.locations.length) {
            await this.saveData();
            return true;
        }
        
        return false;
    }

    /**
     * Get all maintenance records
     * @returns {Array} Array of maintenance record objects
     */
    getMaintenanceRecords() {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        return this.data.maintenance || [];
    }

    /**
     * Get maintenance records for a specific bowser
     * @param {string} bowserId - Bowser ID
     * @returns {Array} Array of maintenance record objects
     */
    getMaintenanceRecordsByBowser(bowserId) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        return this.data.maintenance.filter(record => record.bowserId === bowserId);
    }

    /**
     * Add a new maintenance record
     * @param {Object} record - Maintenance record object
     * @returns {Object} Added maintenance record with ID
     */
    async addMaintenanceRecord(record) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        // Generate a new ID if not provided
        if (!record.id) {
            const lastId = this.data.maintenance.length > 0 
                ? parseInt(this.data.maintenance[this.data.maintenance.length - 1].id.replace('MNT', '')) 
                : 0;
            record.id = `MNT${String(lastId + 1).padStart(3, '0')}`;
        }
        
        this.data.maintenance.push(record);
        await this.saveData();
        return record;
    }
    
    /**
     * Get deployment for a specific bowser
     * @param {string} bowserId - Bowser ID
     * @returns {Object|null} Deployment object or null if not deployed
     */
    getDeploymentByBowserId(bowserId) {
        if (!this.dataLoaded) {
            throw new Error('Database not loaded');
        }
        
        // Find a location that has this bowser assigned
        const location = this.data.locations.find(loc => loc.bowserId === bowserId);
        
        if (location) {
            return {
                bowserId: bowserId,
                locationId: location.id,
                locationName: location.name,
                status: location.status
            };
        }
        
        return null;
    }

    /**
     * Generate a unique ID with a given prefix
     * @param {string} prefix - ID prefix
     * @returns {string} Generated ID
     */
    generateId(prefix = '') {
        const timestamp = new Date().getTime();
        const random = Math.floor(Math.random() * 10000);
        return `${prefix}${timestamp}${random}`;
    }
}

// Create a singleton instance
const dbHandler = new DatabaseHandler();

// Export the instance
export default dbHandler;
