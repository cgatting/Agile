/**
 * Modern Location Management System
 */
class LocationManager {
    constructor() {
        // Initialize state
        this.map = null;
        this.markers = new Map();
        this.selectedLocation = null;
        this.currentView = 'grid';
        this.isFullscreen = false;
        
        // Initialize the application
        this.init();
    }

    async init() {
        try {
            await this.initializeMap();
            this.initializeEventListeners();
            // Load auxiliary data first
            await this.loadAuxData();
            await this.loadLocations();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showNotification('Failed to initialize the application', 'error');
        }
    }

    // Initialize Leaflet Map
    async initializeMap() {
        return new Promise((resolve, reject) => {
            try {
                const defaultCenter = [51.505, -0.09]; // London
                this.map = L.map('locationsMap').setView(defaultCenter, 6);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(this.map);
                this.markers = new Map();
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    initializeEventListeners() {
        // Search functionality with debouncing
        const searchInput = document.getElementById('locationSearch');
        searchInput?.addEventListener('input', this.debounce(() => this.handleSearch(), 300));

        // Filter handlers
        document.getElementById('areaFilter')?.addEventListener('change', () => this.handleFilters());
        document.getElementById('statusFilter')?.addEventListener('change', () => this.handleFilters());

        // View toggle
        document.getElementById('gridViewBtn')?.addEventListener('click', () => this.toggleView('grid'));
        document.getElementById('listViewBtn')?.addEventListener('click', () => this.toggleView('list'));

        // Fullscreen toggle
        document.getElementById('toggleFullscreen')?.addEventListener('click', () => this.toggleFullscreen());

        // Add location form
        document.getElementById('submitLocationBtn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleAddLocation();
        });

        // Address autocomplete (removed Google Places Autocomplete)
        // You can add a Leaflet geocoder plugin here if needed
    }

    async loadLocations() {
        try {
            const response = await fetch('/api/locations');
            if (!response.ok) throw new Error('Failed to fetch locations');
            
            let locations = await response.json();
            console.log('Loaded locations:', locations);
            // Fallback: if locations is an object with a data property, use that
            if (!Array.isArray(locations) && locations.data && Array.isArray(locations.data)) {
                locations = locations.data;
            }
            // Sort locations: active first, then planned, then inactive; within each group sort by name
            const statusOrder = ['active', 'planned', 'inactive'];
            locations.sort((a, b) => {
                const sa = statusOrder.indexOf(a.status);
                const sb = statusOrder.indexOf(b.status);
                if (sa !== sb) return sa - sb;
                return a.name.localeCompare(b.name);
            });
            console.log('Locations sorted by status then name:', locations.map(l => `${l.status}:${l.name}`));
            this.displayLocations(locations);
            this.addMarkersToMap(locations);
            
            return locations;
        } catch (error) {
            console.error('Error loading locations:', error);
            this.showNotification('Failed to load locations', 'error');
            return [];
        }
    }

    displayLocations(locations) {
        const locationList = document.getElementById('locationList');
        if (!locationList) return;

        locationList.innerHTML = '';
        locations.forEach(location => {
            const card = this.createLocationCard(location);
            locationList.appendChild(card);
        });
    }

    createLocationCard(location) {
        const card = document.createElement('div');
        card.className = 'location-card';
        card.dataset.id = location.id;  // for selectLocation
        if (this.selectedLocation?.id === location.id) {
            card.classList.add('active');
        }

        // Compute status based on water level thresholds and deployment state
        const status = this.getStatusForLocation(location);
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
        card.innerHTML = `
            <div class="location-header">
                <h3 class="location-name">${location.name}</h3>
                <span class="location-status ${status.toLowerCase()}">${statusLabel}</span>
            </div>
            <div class="location-details">
                <p><i class="fas fa-map-marker-alt"></i> ${location.address}</p>
                <p><i class="fas fa-envelope"></i> Postcode: ${location.postcode}</p>
                <p><i class="fas fa-map"></i> ${location.area}</p>
                ${location.type ? `<p><i class="fas fa-building"></i> ${location.type}</p>` : ''}
            </div>
        `;

        card.addEventListener('click', () => this.selectLocation(location));
        return card;
    }

    addMarkersToMap(locations) {
        // Clear existing markers
        if (this.markers) {
            this.markers.forEach(marker => this.map.removeLayer(marker));
            this.markers.clear();
        } else {
            this.markers = new Map();
        }

        const bounds = [];
        locations.forEach(location => {
            if (location.latitude == null || location.longitude == null) return;
            const latlng = [location.latitude, location.longitude];
            const marker = L.marker(latlng)
                .addTo(this.map)
                .bindPopup(this.createInfoWindowContent(location));
            marker.on('click', () => this.selectLocation(location));
            this.markers.set(location.id, marker);
            bounds.push(latlng);
        });

        // Fit bounds if markers exist
        if (bounds.length > 0) {
            this.map.fitBounds(bounds);
        }
    }

    createInfoWindowContent(location) {
        // Compute status based on water level thresholds and deployment state
        const status = this.getStatusForLocation(location);
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
        return `
            <div class="info-window">
                <h3>${location.name}</h3>
                <p>${location.address}</p>
                <p><strong>Status:</strong> <span class="status ${status.toLowerCase()}">${statusLabel}</span></p>
                <p><strong>Type:</strong> ${location.type}</p>
                <p><strong>Area:</strong> ${location.area}</p>
            </div>
        `;
    }

    selectLocation(location) {
        this.selectedLocation = location;
        // Update UI
        document.querySelectorAll('.location-card').forEach(card => {
            card.classList.toggle('active', card.dataset.id === location.id);
        });
        // Center map on location
        const marker = this.markers.get(location.id);
        if (marker) {
            this.map.setView(marker.getLatLng(), 15);
            marker.openPopup();
        }
    }

    async handleSearch() {
        const searchTerm = document.getElementById('locationSearch')?.value.toLowerCase() || '';
        await this.handleFilters();
    }

    async handleFilters() {
        const searchTerm = document.getElementById('locationSearch')?.value.toLowerCase() || '';
        const areaFilter = document.getElementById('areaFilter')?.value || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';

        try {
            const locations = await this.loadLocations();
            const filteredLocations = locations.filter(location => {
                const matchesSearch = location.name.toLowerCase().includes(searchTerm) || 
                                    location.address.toLowerCase().includes(searchTerm);
                const matchesArea = !areaFilter || location.area === areaFilter;
                const matchesStatus = !statusFilter || location.status === statusFilter;
                
                return matchesSearch && matchesArea && matchesStatus;
            });

            this.displayLocations(filteredLocations);
            this.updateMapMarkers(filteredLocations);
        } catch (error) {
            console.error('Error applying filters:', error);
            this.showNotification('Failed to apply filters', 'error');
        }
    }

    updateMapMarkers(locations) {
        this.markers.forEach(marker => {
            const locationId = marker.get('locationId');
            const isVisible = locations.some(loc => loc.id === locationId);
            marker.setVisible(isVisible);
        });
    }

    toggleView(view) {
        this.currentView = view;
        const locationList = document.getElementById('locationList');
        const gridBtn = document.getElementById('gridViewBtn');
        const listBtn = document.getElementById('listViewBtn');

        if (locationList) {
            locationList.className = `locations-list ${view}-view`;
        }

        gridBtn?.classList.toggle('active', view === 'grid');
        listBtn?.classList.toggle('active', view === 'list');
    }

    toggleFullscreen() {
        const mapContainer = document.getElementById('locationsMap');
        const fullscreenBtn = document.getElementById('toggleFullscreen');
        
        if (!mapContainer || !fullscreenBtn) return;

        if (!document.fullscreenElement) {
            mapContainer.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            mapContainer.classList.add('fullscreen');
        } else {
            document.exitFullscreen();
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            mapContainer.classList.remove('fullscreen');
        }

        this.isFullscreen = !this.isFullscreen;
        google.maps.event.trigger(this.map, 'resize');
    }

    async handleAddLocation() {
        const form = document.getElementById('addLocationForm');
        if (!form) return;

        const formData = new FormData(form);
        // Extract coordinates from selectedLocation
        const coords = this.selectedLocation || {};
        const newLocation = {
            name: formData.get('locationName'),
            address: formData.get('locationAddress'),
            area: formData.get('locationArea'),
            postcode: formData.get('locationPostcode') || '',
            type: formData.get('locationType'),
            status: formData.get('locationStatus'),
            notes: formData.get('locationNotes'),
            latitude: coords.lat || null,
            longitude: coords.lng || null
        };

        try {
            const response = await fetch('/api/locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newLocation)
            });

            if (!response.ok) throw new Error('Failed to add location');

            await this.loadLocations();
            bootstrap.Modal.getInstance(document.getElementById('addLocationModal'))?.hide();
            form.reset();
            this.showNotification('Location added successfully', 'success');
        } catch (error) {
            console.error('Error adding location:', error);
            this.showNotification('Failed to add location', 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            document.body.appendChild(notification);
        }

        // Set notification content and style
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.display = 'block';

        // Hide notification after delay
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Load bowsers and deployments for status computation
    async loadAuxData() {
        try {
            const [bowsersRes, depsRes] = await Promise.all([
                fetch('/api/bowsers'),
                fetch('/api/deployments')
            ]);
            let bowsers = await bowsersRes.json();
            if (!Array.isArray(bowsers) && bowsers.data) bowsers = bowsers.data;
            this.bowsers = bowsers;
            let deployments = await depsRes.json();
            if (!Array.isArray(deployments) && deployments.data) deployments = deployments.data;
            this.deployments = deployments;
        } catch (e) {
            console.error('Error loading auxiliary data:', e);
            this.bowsers = [];
            this.deployments = [];
        }
    }

    // Determine status string based on water levels and deployment state
    getStatusForLocation(location) {
        // Find an active or scheduled deployment for this location
        const dep = this.deployments.find(d => d.location_id === location.id && ['active','scheduled'].includes(d.status));
        if (!dep) {
            return 'inactive';  // no deployment
        }
        // Find bowser assigned
        const bow = this.bowsers.find(b => b.id === dep.bowser_id);
        if (bow && bow.current_level != null && bow.capacity) {
            const pct = (bow.current_level / bow.capacity) * 100;
            if (pct < 25) return 'refilling';
        }
        if (dep.status === 'active') return 'available';
        return 'maintenance';
    }
}

// Initialize location manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.locationManager = new LocationManager();
});
