/**
 * Emergency Priority System for AquaAlert
 * Handles priority-based resource allocation and deployment
 */
class PriorityManager {
    constructor() {
        this.priorityLevels = {
            healthcare: {
                level: 1,
                description: 'Healthcare Facilities',
                minSupplyLevel: 80,
                responseTime: 60, // minutes
                checkInterval: 15 // minutes
            },
            emergency: {
                level: 2,
                description: 'Emergency Services',
                minSupplyLevel: 75,
                responseTime: 90,
                checkInterval: 20
            },
            critical: {
                level: 3,
                description: 'Critical Industries',
                minSupplyLevel: 70,
                responseTime: 120,
                checkInterval: 30
            },
            residential: {
                level: 4,
                description: 'Residential Areas',
                minSupplyLevel: 60,
                responseTime: 180,
                checkInterval: 45
            },
            commercial: {
                level: 5,
                description: 'Commercial Areas',
                minSupplyLevel: 50,
                responseTime: 240,
                checkInterval: 60
            }
        };

        this.locationTypes = {
            hospital: 'healthcare',
            clinic: 'healthcare',
            fireStation: 'emergency',
            policeStation: 'emergency',
            ambulanceDepot: 'emergency',
            powerPlant: 'critical',
            waterTreatment: 'critical',
            dataCenter: 'critical',
            residential: 'residential',
            apartment: 'residential',
            office: 'commercial',
            retail: 'commercial'
        };

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Monitor supply levels
        setInterval(() => this.checkSupplyLevels(), 60000); // Every minute
        
        // Monitor response times
        setInterval(() => this.checkResponseTimes(), 300000); // Every 5 minutes
    }

    /**
     * Calculate priority score for a location
     * Lower score = Higher priority
     */
    calculatePriorityScore(location, currentSupply = null, responseTime = null) {
        const type = this.locationTypes[location.type] || 'commercial';
        const baseScore = this.priorityLevels[type].level * 1000;
        
        // Supply level impact (0-100)
        const supplyScore = currentSupply ? 
            Math.max(0, currentSupply - this.priorityLevels[type].minSupplyLevel) : 0;
        
        // Response time impact (0-100)
        const responseScore = responseTime ? 
            Math.max(0, (responseTime - this.priorityLevels[type].responseTime) / 60 * 100) : 0;
        
        // Population impact (0-100)
        const populationScore = location.estimatedPopulation ? 
            Math.max(0, 100 - (location.estimatedPopulation / 1000)) : 50;
        
        // Special conditions
        const specialScore = this.calculateSpecialConditions(location);
        
        return baseScore + supplyScore + responseScore + populationScore - specialScore;
    }

    calculateSpecialConditions(location) {
        let score = 0;

        // Vulnerable populations
        if (location.hasVulnerablePopulation) score += 200;
        
        // Critical equipment
        if (location.hasCriticalEquipment) score += 150;
        
        // Weather conditions
        if (this.isExtremeWeather()) score += 100;
        
        // Time of day (higher priority during business hours for critical services)
        const hour = new Date().getHours();
        if (this.locationTypes[location.type] === 'healthcare' || 
            this.locationTypes[location.type] === 'emergency') {
            score += 100; // Always high priority
        } else if (hour >= 9 && hour <= 17) {
            score += 50; // Business hours
        }

        return score;
    }

    /**
     * Get optimal bowser allocation based on priorities
     */
    getOptimalAllocation(availableBowsers, locations) {
        const allocation = new Map();
        const prioritizedLocations = [...locations]
            .sort((a, b) => this.calculatePriorityScore(a) - this.calculatePriorityScore(b));
        
        const availableBowsersList = [...availableBowsers]
            .sort((a, b) => b.capacity - a.capacity);
        
        for (const location of prioritizedLocations) {
            if (availableBowsersList.length === 0) break;
            
            const requiredCapacity = this.calculateRequiredCapacity(location);
            let allocatedBowsers = [];
            let totalAllocatedCapacity = 0;
            
            while (totalAllocatedCapacity < requiredCapacity && availableBowsersList.length > 0) {
                const bowser = availableBowsersList.shift();
                allocatedBowsers.push(bowser);
                totalAllocatedCapacity += bowser.capacity;
            }
            
            if (allocatedBowsers.length > 0) {
                allocation.set(location.id, allocatedBowsers);
            }
        }
        
        return allocation;
    }

    calculateRequiredCapacity(location) {
        const type = this.locationTypes[location.type] || 'commercial';
        const baseCapacity = location.estimatedPopulation * 10; // 10L per person
        const priorityMultiplier = 1 + ((5 - this.priorityLevels[type].level) * 0.2);
        return baseCapacity * priorityMultiplier;
    }

    /**
     * Check current supply levels against minimum requirements
     */
    async checkSupplyLevels() {
        const deployments = await this.getCurrentDeployments();
        const alerts = [];

        for (const deployment of deployments) {
            const location = await this.getLocation(deployment.locationId);
            const type = this.locationTypes[location.type] || 'commercial';
            const minLevel = this.priorityLevels[type].minSupplyLevel;

            if (deployment.supplyLevel < minLevel) {
                alerts.push({
                    type: 'supply',
                    priority: this.priorityLevels[type].level,
                    location: location,
                    currentLevel: deployment.supplyLevel,
                    minLevel: minLevel,
                    timeToEmpty: this.calculateTimeToEmpty(deployment)
                });
            }
        }

        if (alerts.length > 0) {
            this.handleSupplyAlerts(alerts);
        }
    }

    /**
     * Check response times for service requests
     */
    async checkResponseTimes() {
        const requests = await this.getPendingRequests();
        const alerts = [];

        for (const request of requests) {
            const location = await this.getLocation(request.locationId);
            const type = this.locationTypes[location.type] || 'commercial';
            const maxResponse = this.priorityLevels[type].responseTime;
            const currentResponse = this.calculateResponseTime(request);

            if (currentResponse > maxResponse) {
                alerts.push({
                    type: 'response',
                    priority: this.priorityLevels[type].level,
                    location: location,
                    currentTime: currentResponse,
                    maxTime: maxResponse,
                    request: request
                });
            }
        }

        if (alerts.length > 0) {
            this.handleResponseAlerts(alerts);
        }
    }

    /**
     * Handle supply level alerts
     */
    async handleSupplyAlerts(alerts) {
        // Sort alerts by priority
        alerts.sort((a, b) => a.priority - b.priority);

        for (const alert of alerts) {
            // Create system alert
            await this.createAlert({
                type: 'supply_warning',
                locationId: alert.location.id,
                message: `Supply level critical at ${alert.location.name}. Current: ${alert.currentLevel}%, Minimum: ${alert.minLevel}%. Time to empty: ${alert.timeToEmpty} minutes.`,
                priority: alert.priority
            });

            // Notify relevant stakeholders
            await this.notifyStakeholders(alert);

            // Request refill if needed
            if (alert.timeToEmpty < 120) { // 2 hours
                await this.requestRefill(alert.location);
            }
        }
    }

    /**
     * Handle response time alerts
     */
    async handleResponseAlerts(alerts) {
        // Sort alerts by priority
        alerts.sort((a, b) => a.priority - b.priority);

        for (const alert of alerts) {
            // Create system alert
            await this.createAlert({
                type: 'response_delay',
                locationId: alert.location.id,
                message: `Response time exceeded for ${alert.location.name}. Current: ${alert.currentTime} minutes, Maximum: ${alert.maxTime} minutes.`,
                priority: alert.priority
            });

            // Escalate if necessary
            if (alert.currentTime > alert.maxTime * 1.5) {
                await this.escalateRequest(alert.request);
            }

            // Notify management
            await this.notifyManagement(alert);
        }
    }

    /**
     * Calculate estimated time until bowser is empty
     */
    calculateTimeToEmpty(deployment) {
        const usageRate = this.estimateUsageRate(deployment);
        return Math.floor((deployment.supplyLevel / usageRate) * 60);
    }

    /**
     * Estimate usage rate (%/hour) based on location type and time of day
     */
    estimateUsageRate(deployment) {
        const location = dataManager.locations.find(l => l.id === deployment.locationId);
        const type = this.locationTypes[location.type] || 'commercial';
        const hour = new Date().getHours();
        
        // Base rate by type
        let rate = {
            healthcare: 5,
            emergency: 4,
            critical: 4,
            residential: 3,
            commercial: 2
        }[type];

        // Time of day adjustment
        if (hour >= 6 && hour <= 9) rate *= 1.5;  // Morning peak
        if (hour >= 17 && hour <= 20) rate *= 1.3; // Evening peak
        if (hour >= 23 || hour <= 5) rate *= 0.5;  // Night time

        // Weather adjustment
        if (this.isExtremeWeather()) rate *= 1.4;

        return rate;
    }

    /**
     * Check for extreme weather conditions
     */
    isExtremeWeather() {
        // In a real application, this would check weather API
        return false;
    }

    /**
     * Get current deployments from data manager
     */
    async getCurrentDeployments() {
        // In a real application, this would be an API call
        return dataManager.deployments.filter(d => d.status === 'active');
    }

    /**
     * Get location details from data manager
     */
    async getLocation(locationId) {
        // In a real application, this would be an API call
        return dataManager.locations.find(l => l.id === locationId);
    }

    /**
     * Get pending service requests
     */
    async getPendingRequests() {
        // In a real application, this would be an API call
        return dataManager.serviceRequests?.filter(r => r.status === 'pending') || [];
    }

    /**
     * Calculate current response time for a request
     */
    calculateResponseTime(request) {
        const now = new Date();
        const created = new Date(request.createdAt);
        return Math.floor((now - created) / 60000); // Convert to minutes
    }

    /**
     * Create a system alert
     */
    async createAlert(alertData) {
        // In a real application, this would be an API call
        const alert = {
            id: String(Date.now()),
            ...alertData,
            createdAt: new Date().toISOString(),
            status: 'active'
        };

        if (!dataManager.alerts) dataManager.alerts = [];
        dataManager.alerts.push(alert);
    }

    /**
     * Notify relevant stakeholders about an alert
     */
    async notifyStakeholders(alert) {
        // In a real application, this would send actual notifications
        console.log('Notifying stakeholders:', alert);
    }

    /**
     * Request bowser refill
     */
    async requestRefill(location) {
        // In a real application, this would create a refill request
        console.log('Requesting refill for location:', location.name);
    }

    /**
     * Escalate a service request
     */
    async escalateRequest(request) {
        // In a real application, this would escalate to management
        console.log('Escalating request:', request.id);
    }

    /**
     * Notify management about response time issues
     */
    async notifyManagement(alert) {
        // In a real application, this would send actual notifications
        console.log('Notifying management:', alert);
    }
}

// Initialize priority manager when the page loads
let priorityManager;
document.addEventListener('DOMContentLoaded', () => {
    priorityManager = new PriorityManager();
});
