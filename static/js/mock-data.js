/**
 * Mock data for AquaAlert application
 * This file provides mock data for development and testing purposes
 */

// If dataManager is not defined yet, create a placeholder
if (typeof dataManager === 'undefined') {
    console.warn('DataManager not initialized. Creating placeholder.');
    window.dataManager = {
        locations: [],
        bowsers: [],
        deployments: [],
        loadMockData: function() { console.log('Mock data loaded'); },
        addLocation: function(location) { 
            this.locations.push(location);
            console.log('Location added:', location);
            return location;
        },
        getLocations: function() { return this.locations; },
        getLocationById: function(id) { return this.locations.find(loc => loc.id === id); },
        getBowsers: function() { return this.bowsers; },
        getBowserById: function(id) { return this.bowsers.find(b => b.id === id); },
        getDeploymentsByLocation: function(locationId) {
            return this.deployments.filter(d => d.locationId === locationId);
        },
        getActiveAlerts: function() { return []; }
    };
}

// Mock locations data
const mockLocations = [
    { 
        id: '1', 
        name: 'Central Hospital', 
        address: '123 Main St, London', 
        coordinates: [51.505, -0.09], 
        type: 'healthcare',
        status: 'active'
    },
    { 
        id: '2', 
        name: 'North Community Center', 
        address: '456 Oak Ave, London', 
        coordinates: [51.51, -0.1], 
        type: 'community',
        status: 'active'
    },
    { 
        id: '3', 
        name: 'East Residential Complex', 
        address: '789 Pine Rd, London', 
        coordinates: [51.515, -0.08], 
        type: 'residential',
        status: 'active'
    },
    { 
        id: '4', 
        name: 'South School', 
        address: '101 Elm St, London', 
        coordinates: [51.495, -0.09], 
        type: 'education',
        status: 'planned'
    },
    { 
        id: '5', 
        name: 'West Shopping Mall', 
        address: '202 Cedar Blvd, London', 
        coordinates: [51.505, -0.11], 
        type: 'commercial',
        status: 'active'
    }
];

// Add mock locations to dataManager if it exists
if (dataManager && typeof dataManager.locations !== 'undefined') {
    // Only add mock locations if dataManager.locations is empty
    if (dataManager.locations.length === 0) {
        dataManager.locations = mockLocations;
        console.log('Mock locations data loaded');
    }
}