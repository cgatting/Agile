/**
 * Configuration settings for the AquaAlert application
 */
const CONFIG = {
    // Map settings
    map: {
        defaultCenter: [51.505, -0.09], // Default center coordinates (London)
        defaultZoom: 10, // Default zoom level
        tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors'
    },
    
    // API endpoints (for future backend integration)
    api: {
        base: 'http://localhost:5000/api',
        endpoints: {
            bowsers: '/bowsers',
            locations: '/locations',
            deployments: '/deployments',
            maintenance: '/maintenance',
            alerts: '/alerts',
            schedule: '/schedule',
            refills: '/refills',
            users: '/users',
            reports: '/reports'
        }
    },
    
    // Refresh intervals (in milliseconds)
    refreshIntervals: {
        dashboard: 60000, // 1 minute
        alerts: 30000, // 30 seconds
        schedule: 300000, // 5 minutes
        map: 120000 // 2 minutes
    },
    
    // Status colors
    statusColors: {
        active: '#38a169', // Green
        maintenance: '#dd6b20', // Orange
        outOfService: '#e53e3e', // Red
        lowSupply: '#d69e2e', // Yellow
        available: '#3182ce' // Blue
    },
    
    // Alert priorities
    priorities: {
        high: 'high',
        medium: 'medium',
        low: 'low'
    },
    
    // Mock data configuration
    mockData: {
        enabled: true,
        delay: 0
    },
    
    // Water bowser capacities (in liters)
    bowserCapacities: [
        1000,
        2000,
        5000,
        10000
    ],
    
    // Default location search radius (in kilometers)
    defaultSearchRadius: 10

};
