import { dataManager } from './data.js';

/**
 * Public interface functionality for AquaAlert
 */
class PublicInterface {
    constructor() {
        console.log('PublicInterface constructor called');
        this.map = null;
        this.markers = {};
        this.currentPostcode = null;
        
        // Initialize everything in sequence to ensure proper loading
        this.initializeMap();
        this.initializeEventListeners();
        
        // Initialize data from server API and then load public data
        dataManager.initializeData()
            .then(() => {
                this.loadPublicData();
            })
            .catch(error => {
                console.error('Data initialization failed:', error);
                this.showNotification('Error loading data', 'error');
            });
    }

    initializeMap() {
        console.log('Initializing map...');
        try {
            // Check if the map element exists
            const mapElement = document.getElementById('publicMap');
            if (!mapElement) {
                console.error('Map element not found in the DOM');
                return;
            }
            
            // Use a simple approach to initialize the map with OpenStreetMap tiles
            this.map = L.map('publicMap').setView([51.505, -0.09], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: ' OpenStreetMap contributors'
            }).addTo(this.map);
            
            // Add a click event to the map for debugging
            this.map.on('click', (e) => {
                console.log('Map clicked at coordinates:', e.latlng);
            });
            
            console.log('Map initialized successfully');
        } catch (error) {
            console.error('Error initializing map:', error);
            this.showNotification('Error initializing map: ' + error.message, 'error');
        }
    }
    
    // Direct test to add a marker to verify basic functionality
    addTestMarker() {
        if (!this.map) {
            console.error('Map not initialized for test marker');
            return;
        }
        
        console.log('Adding test marker to map');
        try {
            // Add a simple test marker for Westminster (SW1 area)
            const testMarker = L.marker([51.498, -0.134]) // Westminster coordinates
                .bindPopup('<strong>Test Marker</strong><br>Westminster (SW1)')
                .addTo(this.map);
            
            console.log('Test marker added successfully');
            
            // Center map on the test marker
            this.map.setView([51.498, -0.134], 13);
        } catch (error) {
            console.error('Error adding test marker:', error);
            alert('Error adding test marker: ' + error.message);
        }
    }

    initializeEventListeners() {
        // Search functionality - using a more specific selector for the Find Water button
        const searchBtn = document.querySelector('.input-group-lg .btn-light');
        if (searchBtn) {
            console.log('Found search button, adding event listener');
            searchBtn.addEventListener('click', () => {
                const postcode = document.getElementById('locationSearch').value;
                console.log('Search button clicked with postcode:', postcode);
                this.searchLocation(postcode);
            });
        } else {
            console.error('Search button not found in the DOM');
        }
        
        // Also add event listener for pressing Enter in the search input
        const searchInput = document.getElementById('locationSearch');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const postcode = searchInput.value;
                    console.log('Enter pressed in search with postcode:', postcode);
                    this.searchLocation(postcode);
                }
            });
        }
        
        // Add a global event listener for the report issue buttons in popups
        // This is necessary because the popup content is dynamically created
        document.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('report-issue-btn')) {
                const bowserNumber = e.target.getAttribute('data-bowser-number');
                const locationId = e.target.getAttribute('data-location-id');

                if (bowserNumber) {
                    console.log('Report issue button clicked for bowser:', bowserNumber);
                    this.navigateToReport({ bowserNumber });
                } else if (locationId) {
                    console.log('Report issue button clicked for location:', locationId);
                    this.navigateToReport({ locationId });
                }
            }
        });

        // Filter handlers
        document.getElementById('areaFilter').addEventListener('change', () => this.filterLocations());
        document.getElementById('statusFilter').addEventListener('change', () => this.filterLocations());

        // Report form submission
        document.getElementById('reportForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitReport();
        });

        // Subscribe form submission
        document.getElementById('subscribeForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitSubscription();
        });

        // Emergency banner close
        const closeBanner = document.querySelector('.close-banner');
        if (closeBanner) {
            closeBanner.addEventListener('click', () => {
                document.getElementById('emergencyBanner').style.display = 'none';
            });
        }

        // Refresh map data
        const refreshBtn = document.getElementById('refreshMap');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.showNotification('Refreshing map data...', 'info');
                dataManager.initializeData()
                  .then(() => this.loadPublicData())
                  .catch(err => console.error('Error refreshing public data:', err));
            });
        }
    }

    // Display all location sites as base markers
    displayAllLocations(locations) {
        // Use standard marker icon for locations
        locations.forEach(location => {
            if (location.latitude != null && location.longitude != null) {
                try {
                    const popupContent = `
                        <div class="marker-popup">
                            <h3>${location.name}</h3>
                            <p><strong>Address:</strong> ${location.address || 'N/A'}</p>
                            <p><strong>Postcode:</strong> ${location.postcode || 'N/A'}</p>
                            <p><strong>Status:</strong> ${location.status.charAt(0).toUpperCase() + location.status.slice(1)}</p>
                            <button class="primary-btn report-issue-btn" data-location-id="${location.id}">
                                Report Issue
                            </button>
                        </div>
                    `;
                    const marker = L.marker([location.latitude, location.longitude])
                        .addTo(this.map)
                        .bindPopup(popupContent);
                    // Store under unique key
                    this.markers['loc_' + location.id] = marker;
                } catch (e) {
                    console.error('Error adding location marker:', e);
                }
            }
        });
    }

    async loadPublicData() {
        try {
            console.log('Loading public data...');
            
            // Load all locations and filter to only active ones, then sort by name
            let locations = dataManager.getLocations().filter(loc => loc.status === 'active');
            locations.sort((a, b) => a.name.localeCompare(b.name));
            // Load active deployments and sort by corresponding location name
            let deployments = dataManager.getActiveDeployments();
            deployments.sort((d1, d2) => {
                const loc1 = locations.find(l => l.id === d1.location_id)?.name || '';
                const loc2 = locations.find(l => l.id === d2.location_id)?.name || '';
                return loc1.localeCompare(loc2);
            });

            const alerts = dataManager.getEmergencyAlerts();

            console.log('Found deployments:', deployments.length, deployments);
            console.log('Found locations:', locations.length, locations);
            
            if (deployments.length === 0) {
                console.warn('No active deployments found! Check data.js');
                alert('Debug: No active deployments found! Please check console.');
            }
            
            // Clear existing markers first
            this.clearAllMarkers();

            // Display base markers for all active locations
            this.displayAllLocations(locations);
            
            // Then overlay bowser deployments (sorted)
            this.displayBowserLocations(deployments, locations);
            // After listing deployed bowsers, also list active locations with no deployment
            const bowserList = document.getElementById('bowserList');
            locations.forEach(location => {
                // Skip if there's an active deployment at this location
                if (!deployments.some(dep => dep.location_id === location.id)) {
                    const locationCard = this.createLocationOnlyCard(location);
                    bowserList.appendChild(locationCard);
                }
            });
            this.displayAlerts(alerts);
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Error loading data: ' + error.message); // More visible error
            this.showNotification('Error loading data', 'error');
        }
    }

    // Helper method to clear all markers from the map
    clearAllMarkers() {
        console.log('Clearing all markers from map');
        if (this.map && this.markers) {
            Object.values(this.markers).forEach(marker => {
                if (marker) { 
                    try {
                        this.map.removeLayer(marker);
                    } catch (e) {
                        console.error('Error removing marker:', e);
                    }
                }
            });
        }
        this.markers = {}; // Reset the markers object
    }

    displayBowserLocations(deployments, locations) {
        console.log('Displaying bowser locations:', deployments.length, 'deployments');
        if (!this.map) {
            console.error('Map not initialized! Cannot display locations.');
            return;
        }
        
        const bowserList = document.getElementById('bowserList');
        if (!bowserList) {
            console.error('bowserList element not found!');
            return;
        }
        
        bowserList.innerHTML = ''; // Clear the list view

        let markersAdded = 0;
        
        // SIMPLER APPROACH: Add SW1 markers directly first to ensure they appear
        const sw1Locations = locations.filter(l => l.name.includes('SW1') || l.address.includes('SW1'));
        console.log('SW1 locations found:', sw1Locations.length, sw1Locations);
        
        // First add SW1 locations directly to ensure they appear
        sw1Locations.forEach(location => {
            console.log('Adding direct SW1 marker for:', location.name, 'at', [location.latitude, location.longitude]);
            try {
                const marker = L.marker([location.latitude, location.longitude])
                    .bindPopup(`<strong>${location.name}</strong><br>${location.address}`)
                    .addTo(this.map);
                    
                markersAdded++;
                this.markers['direct_' + location.id] = marker;
            } catch (e) {
                console.error('Error adding direct SW1 marker:', e);
            }
        });
        
        // Then process each deployment
        deployments.forEach(deployment => {
            // Skip if this deployment has already been processed
            if (this.markers[deployment.id]) {
                console.log('Marker already exists for deployment:', deployment.id);
                return;
            }

            const location = locations.find(l => l.id === deployment.location_id);
            const bowser = dataManager.getBowsers().find(b => b.id === deployment.bowser_id);
            
            if (location && bowser && location.latitude != null && location.longitude != null) {
                console.log(`Adding marker for deployment ${deployment.id} at coordinates:`, [location.latitude, location.longitude]);
                
                try {
                    // Simpler approach to create and add marker
                    const marker = L.marker([location.latitude, location.longitude])
                        .bindPopup(this.createMarkerPopup(location, bowser, deployment))
                        .addTo(this.map);
                    
                    // Store reference to this marker
                    this.markers[deployment.id] = marker;
                    markersAdded++;

                    // Add to list view
                    const card = this.createBowserCard(location, bowser, deployment);
                    bowserList.appendChild(card);
                } catch (e) {
                    console.error('Error adding marker:', e, 'for coordinates:', [location.latitude, location.longitude]);
                }
            } else {
                let missingData = [];
                if (!location) missingData.push('location');
                if (!bowser) missingData.push('bowser');
                if (location && !location.latitude) missingData.push('latitude');
                if (location && !location.longitude) missingData.push('longitude');
                
                console.warn(`⚠️ Skipping deployment ${deployment.id}: Missing ${missingData.join(', ')}`);
            }
        });

        console.log(`Added ${markersAdded} markers to the map`);
        // Fit map to show all markers
        const allMarkers = Object.values(this.markers);
        if (allMarkers.length > 0) {
            const group = new L.featureGroup(allMarkers);
            this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
        }
    }

    createMarkerPopup(location, bowser, deployment) {
        // Extract postcode from address if available, or use a default
        const postcode = location.postcode || this.extractPostcode(location.address) || '';
        
        // Use a data attribute for the bowser number to avoid JS injection
        return `
            <div class="marker-popup">
                <h3>${location.name}</h3>
                <p><strong>Address:</strong> ${location.address}</p>
                <p><strong>Postcode:</strong> ${postcode}</p>
                <p><strong>Bowser:</strong> ${bowser.number}</p>
                ${(() => {
                    const key = this.getStatusForLocation(location);
                    const label = key.charAt(0).toUpperCase() + key.slice(1);
                    let extra = '';
                    if (key === 'scheduled') {
                        // Show scheduled start date
                        const start = new Date(deployment.start_date);
                        extra = `<p><strong>Scheduled:</strong> ${start.toLocaleDateString()}</p>`;
                    }
                    return `<p><strong>Status:</strong> ${label}</p>${extra}`;
                })()}
                <button class="primary-btn report-issue-btn" data-bowser-number="${bowser.number}">
                    Report Issue
                </button>
            </div>
        `;
    }

    createBowserCard(location, bowser, deployment) {
        const card = document.createElement('div');
        card.className = 'bowser-card';
        
        // Extract postcode from address if available, or use a default
        const postcode = location.postcode || this.extractPostcode(location.address) || '';
        
        const statusKey = this.getStatusForLocation(location);
        const statusLabel = statusKey.charAt(0).toUpperCase() + statusKey.slice(1);
        card.innerHTML = `
            <div class="bowser-status status-${statusKey}">${statusLabel}</div>
            <h3>${location.name}</h3>
            <p><i class="fas fa-map-marker-alt"></i> ${location.address}</p>
            <p><i class="fas fa-envelope"></i> Postcode: ${postcode}</p>
            <p><i class="fas fa-truck"></i> Bowser ${bowser.number}</p>
            <p><i class="fas fa-tint"></i> Supply Level: ${Math.round((bowser.current_level / bowser.capacity) * 100)}%</p>
            <button onclick="publicInterface.navigateToReport('${bowser.number}')" class="submit-btn">
                Report Issue
            </button>
        `;

        card.addEventListener('click', () => {
            const marker = this.markers[deployment.id];
            if (marker) {
                this.map.setView(marker.getLatLng(), 15);
                marker.openPopup();
            }
        });

        return card;
    }

    /**
     * Determine status based on deployments and water level
     * @param {Object} location - The location object
     * @returns {string} one of 'inactive','refilling','available','maintenance'
     */
    getStatusForLocation(location) {
        // Find an active or scheduled deployment for this location
        const dep = dataManager.getActiveDeployments().find(d => d.location_id === location.id && ['active','scheduled'].includes(d.status));
        if (!dep) {
            return 'inactive';
        }
        // Find the bowser assigned
        const bowser = dataManager.getBowsers().find(b => b.id === dep.bowser_id);
        // If water level is low, show refilling
        if (bowser && bowser.current_level != null && bowser.capacity) {
            const pct = (bowser.current_level / bowser.capacity) * 100;
            if (pct < 25) return 'refilling';
        }
        // Active deployments are 'available'
        if (dep.status === 'active') return 'available';
        // Scheduled deployments are 'scheduled'
        if (dep.status === 'scheduled') return 'scheduled';
        // Any other state treat as maintenance
        return 'maintenance';
    }

    displayAlerts(alerts) {
        const alertsList = document.getElementById('alertsList');
        alertsList.innerHTML = '';

        alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .forEach(alert => {
                  const card = document.createElement('div');
                  card.className = 'alert-card';
                  
                  const iconClass = this.getAlertIcon(alert.type);
                  const timeAgo = this.getTimeAgo(new Date(alert.timestamp));
                  
                  card.innerHTML = `
                      <div class="alert-icon ${alert.type}">
                          <i class="${iconClass}"></i>
                      </div>
                      <div class="alert-content">
                          <h3>${this.formatAlertType(alert.type)}</h3>
                          <p>${alert.message}</p>
                          <span class="alert-time">${timeAgo}</span>
                      </div>
                  `;
                  
                  alertsList.appendChild(card);
              });
    }

    getAlertIcon(type) {
        switch (type) {
            case 'emergency': return 'fas fa-exclamation-triangle alert-emergency';
            case 'maintenance': return 'fas fa-wrench alert-warning';
            case 'deployment': return 'fas fa-truck alert-info';
            default: return 'fas fa-info-circle alert-info';
        }
    }

    formatAlertType(type) {
        return type.charAt(0).toUpperCase() + type.slice(1) + ' Alert';
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) {
            return `${diffMins} minutes ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hours ago`;
        } else {
            return `${diffDays} days ago`;
        }
    }
    
    /**
     * Extract postcode from address string
     * @param {string} address - Full address string
     * @returns {string|null} - Extracted postcode or null if not found
     */
    extractPostcode(address) {
        if (!address) return null;
        
        // Common UK postcode patterns
        const postcodeRegex = /\b([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})\b/i;
        
        // Check for specific area codes mentioned in the address
        if (address.includes('SW1')) return 'SW1';
        if (address.includes('SW2')) return 'SW2';
        if (address.includes('SE1')) return 'SE1';
        
        // Try to extract using regex pattern
        const match = address.match(postcodeRegex);
        if (match && match[1]) {
            return match[1].toUpperCase();
        }
        
        // If we can't find a postcode, check if the address ends with "London" and add a default area
        if (address.includes('London')) {
            // Extract the area from the location name if possible
            if (address.includes('Westminster')) return 'SW1';
            if (address.includes('Southwark')) return 'SE1';
            
            // Default to central London
            return 'SW1';
        }
        
        return null;
    }

    async searchLocation(postcode) {
        if (!postcode || postcode.trim() === '') {
            this.showNotification('Please enter a valid postcode', 'warning');
            return;
        }
        
        console.log('Searching for location with postcode:', postcode);
        
        // In a real application, this would use a geocoding service
        this.showNotification('Searching for water bowsers near ' + postcode, 'info');
        
        try {
            // Simulate search with random nearby location
            // For SW1 postcode, use Westminster coordinates
            let searchLocation;
            
            if (postcode.toUpperCase().includes('SW1')) {
                // Westminster coordinates
                searchLocation = [51.498, -0.134];
                console.log('SW1 postcode detected, using Westminster coordinates');
            } else {
                // Random location near base coordinates
                const baseCoords = [51.505, -0.09];
                const randomOffset = () => (Math.random() - 0.5) * 0.02;
                searchLocation = [baseCoords[0] + randomOffset(), baseCoords[1] + randomOffset()];
                console.log('Using random coordinates near base location');
            }
            
            console.log('Setting map view to:', searchLocation);
            this.map.setView(searchLocation, 15);
            this.currentPostcode = postcode;
            
            // Filter locations based on simulated proximity
            this.filterLocations();
        } catch (error) {
            console.error('Error in searchLocation:', error);
            this.showNotification('Error searching location', 'error');
        }
    }

    filterLocations() {
        const area = document.getElementById('areaFilter').value;
        const status = document.getElementById('statusFilter').value;

        console.log(`Filtering locations: area=${area}, status=${status}`);

        // Clear existing markers before adding new ones
        this.clearAllMarkers();

        // Filter active deployments from data manager
        const deployments = dataManager.getActiveDeployments().filter(deployment => {
            // Check area/status filters
            const locationArea = this.getArea(deployment.location_id);
            
            const matchesArea = area === 'all' || locationArea === area;
            const bowserStatus = this.getStatusForLocation(dataManager.getLocations().find(l => l.id === deployment.location_id));
            const matchesStatus = status === 'all' || bowserStatus === status;
            
            return matchesArea && matchesStatus;
        });

        console.log(`Found ${deployments.length} deployments matching filters`);

        // Display the filtered deployments
        const locations = dataManager.getLocations();
        this.displayBowserLocations(deployments, locations);
    }

    getArea(locationId) {
        // Get area from location name or address
        const location = dataManager.getLocations().find(l => l.id === locationId || l.id === locationId.toString());
        if (location) {
            // Check if location name or address contains the area code
            if (location.name.includes('SW1') || location.address.includes('SW1')) {
                return 'sw1';
            } else if (location.name.includes('SW2') || location.address.includes('SW2')) {
                return 'sw2';
            } else if (location.name.includes('SE1') || location.address.includes('SE1')) {
                return 'se1';
            }
            
            // Fallback to coordinate-based estimation
            const lat = location.latitude;
            const lng = location.longitude;
            
            // Westminster/Victoria area (SW1)
            if (lat >= 51.49 && lat <= 51.5 && lng >= -0.14 && lng <= -0.12) {
                return 'sw1';
            }
            // Other areas based on coordinates
            else if (lat > 51.51) {
                return 'sw2';
            } else {
                return 'se1';
            }
        }
        return 'sw1';
    }

    navigateToReport(identifier) {
        let bowserNumber = null;
        let locationId = null;
        let locationName = null;

        if (identifier.bowserNumber) {
            bowserNumber = identifier.bowserNumber;
            console.log('Navigating to report form for bowser:', bowserNumber);
        } else if (identifier.locationId) {
            locationId = identifier.locationId;
            console.log('Navigating to report form for location ID:', locationId);
            // Attempt to find location name for context
            const location = dataManager.getLocations().find(l => l.id === locationId);
            if (location) {
                locationName = location.name;
                console.log('Found location name:', locationName);
            }
            // If a bowser is deployed at this location, automatically fill its number
            const deploymentForLocation = dataManager.getActiveDeployments().find(dep => dep.location_id === locationId);
            if (deploymentForLocation) {
                const bowserObj = dataManager.getBowsers().find(b => b.id === deploymentForLocation.bowser_id);
                if (bowserObj) {
                    bowserNumber = bowserObj.number;
                    console.log('Found bowser number for location:', bowserNumber);
                }
            }
        }

        // Set hidden form inputs
        const bowserInput = document.getElementById('bowserNumber');
        const locationInput = document.getElementById('locationId'); // Assuming you add this input
        const locationNameDisplay = document.getElementById('reportLocationName'); // Optional: Display location name

        if (bowserInput) {
            bowserInput.value = bowserNumber || ''; // Set to bowser number or empty
        }
        // Add a hidden input for locationId if you need it server-side
        // if (locationInput) {
        //    locationInput.value = locationId || '';
        // }

        // Display location name if reporting for a location without a bowser
        if (locationNameDisplay) {
            if (locationName) {
                locationNameDisplay.textContent = `Reporting for: ${locationName}`;
                locationNameDisplay.style.display = 'block';
            } else {
                locationNameDisplay.style.display = 'none';
            }
        }

        // Scroll to the report section
        const reportSection = document.getElementById('report-section');
        if (reportSection) {
            reportSection.scrollIntoView({ behavior: 'smooth' });
            console.log('Scrolled to report section');
            
            // Flash the form to draw attention
            const reportForm = document.getElementById('reportForm');
            if (reportForm) {
                reportForm.classList.add('highlight-form');
                setTimeout(() => {
                    reportForm.classList.remove('highlight-form');
                }, 2000);
            }
        } else {
            console.error('Could not find report-section element');
            // Fallback: try to find the form directly
            const reportForm = document.getElementById('reportForm');
            if (reportForm) {
                reportForm.scrollIntoView({ behavior: 'smooth' });
                console.log('Fallback: Scrolled to report form');
            } else {
                console.error('Could not find reportForm element either');
                this.showNotification('Could not find the report form. Please scroll down manually.', 'warning');
            }
        }
    }

    async submitReport() {
        const bowserNumber = document.getElementById('bowserNumber').value;
        const issueType = document.getElementById('issueType').value;
        const description = document.getElementById('description').value;
        const contactInfo = document.getElementById('contactInfo').value;

        // Validate required fields
        if (!bowserNumber || !issueType || !description) {
            this.showNotification('Please fill in all required fields', 'warning');
            return;
        }

        try {
            // In a real application, this would be an API call
            const report = {
                id: String(Date.now()),
                bowserNumber,
                issueType,
                description,
                contactInfo,
                timestamp: new Date().toISOString(),
                status: 'submitted'
            };

            // Show confirmation popup
            this.showConfirmationPopup(report);
            
            // Reset the form
            document.getElementById('reportForm').reset();
        } catch (error) {
            console.error('Error submitting report:', error);
            this.showNotification('Error submitting report', 'error');
        }
    }

    async submitSubscription() {
        const postcode = document.getElementById('subscribePostcode').value;
        const email = document.getElementById('subscribeEmail').value;
        const notifications = Array.from(document.querySelectorAll('input[name="notifications"]:checked'))
            .map(checkbox => checkbox.value);

        try {
            // In a real application, this would be an API call
            const subscription = {
                id: String(Date.now()),
                postcode,
                email,
                notifications,
                timestamp: new Date().toISOString()
            };

            // Simulate successful subscription
            this.showNotification('Subscription successful', 'success');
            document.getElementById('subscribeForm').reset();
        } catch (error) {
            this.showNotification('Error processing subscription', 'error');
        }
    }

    showNotification(message, type = 'info') {
        console.log(`Notification (${type}):`, message);
        
        // Check if notification elements exist
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        
        if (!notification || !notificationText) {
            // Create notification elements if they don't exist
            if (!notification) {
                const newNotification = document.createElement('div');
                newNotification.id = 'notification';
                newNotification.className = `notification ${type}`;
                newNotification.style.position = 'fixed';
                newNotification.style.bottom = '20px';
                newNotification.style.right = '20px';
                newNotification.style.padding = '15px 20px';
                newNotification.style.borderRadius = '5px';
                newNotification.style.zIndex = '1000';
                newNotification.style.display = 'none';
                
                const newNotificationText = document.createElement('span');
                newNotificationText.id = 'notificationText';
                newNotificationText.textContent = message;
                
                newNotification.appendChild(newNotificationText);
                document.body.appendChild(newNotification);
                
                setTimeout(() => {
                    newNotification.style.display = 'block';
                    setTimeout(() => {
                        newNotification.style.display = 'none';
                    }, 3000);
                }, 100);
            }
        } else {
            // Use existing notification elements
            notificationText.textContent = message;
            notification.className = `notification ${type}`;
            notification.style.display = 'block';
            
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }
    }
    
    /**
     * Show a confirmation popup when a report is submitted
     * @param {Object} report - The report data
     */
    showConfirmationPopup(report) {
        console.log('Showing confirmation popup for report:', report);
        
        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop';
        backdrop.style.position = 'fixed';
        backdrop.style.top = '0';
        backdrop.style.left = '0';
        backdrop.style.width = '100%';
        backdrop.style.height = '100%';
        backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        backdrop.style.zIndex = '1050';
        backdrop.style.display = 'flex';
        backdrop.style.justifyContent = 'center';
        backdrop.style.alignItems = 'center';
        
        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'confirmation-modal';
        modal.style.backgroundColor = 'white';
        modal.style.borderRadius = '8px';
        modal.style.padding = '30px';
        modal.style.maxWidth = '500px';
        modal.style.width = '90%';
        modal.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
        modal.style.position = 'relative';
        
        // Get issue type text
        let issueTypeText = 'Unknown';
        const issueTypeSelect = document.getElementById('issueType');
        if (issueTypeSelect) {
            const selectedOption = issueTypeSelect.options[issueTypeSelect.selectedIndex];
            if (selectedOption) {
                issueTypeText = selectedOption.text;
            }
        }
        
        // Format timestamp
        const date = new Date(report.timestamp);
        const formattedDate = `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
        
        // Create modal content
        modal.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <i class="fas fa-check-circle" style="font-size: 60px; color: #4CAF50;"></i>
                <h2 style="margin-top: 15px; color: #005288;">Report Submitted Successfully</h2>
            </div>
            <div style="margin-bottom: 20px;">
                <p>Thank you for reporting an issue with our water bowser. Your report has been received and will be addressed promptly.</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 15px;">
                    <p><strong>Reference Number:</strong> #${report.id.slice(-6)}</p>
                    <p><strong>Bowser Number:</strong> ${report.bowserNumber}</p>
                    <p><strong>Issue Type:</strong> ${issueTypeText}</p>
                    <p><strong>Submitted:</strong> ${formattedDate}</p>
                </div>
            </div>
            <div style="display: flex; justify-content: center;">
                <button class="close-modal-btn" style="padding: 10px 20px; background-color: #005288; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">Close</button>
            </div>
        `;
        
        // Add modal to backdrop
        backdrop.appendChild(modal);
        
        // Add backdrop to body
        document.body.appendChild(backdrop);
        
        // Add event listener to close button
        const closeButton = modal.querySelector('.close-modal-btn');
        closeButton.addEventListener('click', () => {
            document.body.removeChild(backdrop);
            this.showNotification('Report submitted successfully', 'success');
        });
        
        // Close modal when clicking outside
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                document.body.removeChild(backdrop);
                this.showNotification('Report submitted successfully', 'success');
            }
        });
    }

    createLocationOnlyCard(location) {
        // Create a card for active locations with no bowser deployment
        const card = document.createElement('div');
        card.className = 'bowser-card location-only';
        // Compute status for a location with no active bowser -> should be 'inactive'
        const statusKey = this.getStatusForLocation(location);
        const statusLabel = statusKey.charAt(0).toUpperCase() + statusKey.slice(1);
        const postcode = this.extractPostcode(location.address) || location.postcode || '';
        card.innerHTML = `
            <div class="location-only-status">${statusLabel}</div>
            <h3>${location.name}</h3>
            <p><i class="fas fa-map-marker-alt"></i> ${location.address}</p>
            <p><i class="fas fa-envelope"></i> Postcode: ${postcode}</p>
            <button class="primary-btn report-issue-btn" data-location-id="${location.id}">
                Report Issue
            </button>
        `;
        card.addEventListener('click', () => {
            const marker = this.markers['loc_' + location.id];
            if (marker) {
                this.map.setView(marker.getLatLng(), 15);
                marker.openPopup();
            }
        });
        return card;
    }
}

// Initialize the public interface when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PublicInterface();
});

// Mobile Navigation Toggle
document.addEventListener('DOMContentLoaded', () => {
    const navToggle = document.createElement('button');
    navToggle.className = 'nav-toggle';
    navToggle.innerHTML = '<i class="fas fa-bars"></i>';
    
    const navLinks = document.querySelector('.nav-links');
    // Use the parent of navLinks for insertion
    if (navLinks && navLinks.parentNode) {
        navLinks.parentNode.insertBefore(navToggle, navLinks);
        
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            navToggle.innerHTML = navLinks.classList.contains('active') 
                ? '<i class="fas fa-times"></i>' 
                : '<i class="fas fa-bars"></i>';
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navLinks.parentNode.contains(e.target) && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                navToggle.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });

        // Close mobile menu when window is resized to desktop size
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                navToggle.innerHTML = '<i class="fas fa-bars"></i>';
            }
        });
    }
});
