/**
 * Demo page functionality for AquaAlert
 */
document.addEventListener('DOMContentLoaded', () => {
    updateOverviewCards();
    updateActiveDeployments();
    updateActiveAlerts();
    updateBowserStatus();
    initializeMap();
});

function updateOverviewCards() {
    const cards = [
        {
            title: 'Active Bowsers',
            value: dataManager.getBowsersByStatus('deployed').length,
            icon: 'fa-truck',
            color: 'success'
        },
        {
            title: 'Active Alerts',
            value: dataManager.getActiveAlerts().length,
            icon: 'fa-exclamation-triangle',
            color: 'danger'
        },
        {
            title: 'Maintenance',
            value: dataManager.getActiveMaintenance().length,
            icon: 'fa-wrench',
            color: 'warning'
        },
        {
            title: 'Total Locations',
            value: dataManager.getLocations().length,
            icon: 'fa-map-marker-alt',
            color: 'info'
        }
    ];

    const container = document.getElementById('overview-cards');
    container.innerHTML = cards.map(card => `
        <div class="col-md-3 col-sm-6 mb-4">
            <div class="card border-${card.color}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="text-muted mb-2">${card.title}</h6>
                            <h2 class="mb-0">${card.value}</h2>
                        </div>
                        <div class="text-${card.color}">
                            <i class="fas ${card.icon} fa-2x"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function updateActiveDeployments() {
    const deployments = dataManager.getActiveDeployments();
    const container = document.getElementById('active-deployments');

    container.innerHTML = deployments.map(deployment => {
        const bowser = dataManager.getBowserById(deployment.bowserId);
        const location = dataManager.getLocationById(deployment.locationId);
        
        return `
            <div class="card mb-3 border-${getSupplyLevelClass(deployment.supplyLevel)}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">${location.name}</h6>
                        <span class="badge bg-${getSupplyLevelClass(deployment.supplyLevel)}">
                            ${deployment.supplyLevel}%
                        </span>
                    </div>
                    <small class="text-muted">
                        Bowser: ${bowser.number} | Since: ${formatDate(deployment.startTime)}
                    </small>
                </div>
            </div>
        `;
    }).join('') || '<p class="text-muted">No active deployments</p>';
}

function updateActiveAlerts() {
    const alerts = dataManager.getActiveAlerts();
    const container = document.getElementById('active-alerts');

    container.innerHTML = alerts.map(alert => {
        const location = dataManager.getLocationById(alert.locationId);
        return `
            <div class="alert alert-warning mb-3">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${location.name}</strong>
                        <p class="mb-0 small">${alert.message}</p>
                    </div>
                    <span class="badge bg-warning">
                        Priority ${alert.priority}
                    </span>
                </div>
                <small class="text-muted">
                    Created: ${formatDate(alert.createdAt)}
                </small>
            </div>
        `;
    }).join('') || '<p class="text-muted">No active alerts</p>';
}

function updateBowserStatus() {
    const bowsers = dataManager.getBowsers();
    const container = document.getElementById('bowser-status');

    container.innerHTML = bowsers.map(bowser => `
        <tr>
            <td>
                <strong>${bowser.number}</strong>
                <br>
                <small class="text-muted">${bowser.manufacturer} ${bowser.model}</small>
            </td>
            <td>
                <span class="badge bg-${getStatusClass(bowser.status)}">
                    ${bowser.status}
                </span>
            </td>
            <td>${bowser.capacity} L</td>
            <td>
                <div class="progress" style="height: 20px;">
                    <div class="progress-bar bg-${getSupplyLevelClass(bowser.currentLevel / bowser.capacity * 100)}" 
                         role="progressbar" 
                         style="width: ${(bowser.currentLevel / bowser.capacity * 100)}%">
                        ${bowser.currentLevel} L
                    </div>
                </div>
            </td>
            <td>${formatDate(bowser.lastMaintenance)}</td>
            <td>${formatDate(bowser.nextMaintenance)}</td>
        </tr>
    `).join('');
}

function initializeMap() {
    const map = L.map('map').setView([51.5074, -0.1278], 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const locations = dataManager.getLocations();
    locations.forEach(location => {
        const marker = L.marker([location.coordinates.lat, location.coordinates.lng])
            .addTo(map);

        const deployment = dataManager.getDeploymentsByLocation(location.id)[0];
        const bowser = deployment ? dataManager.getBowserById(deployment.bowserId) : null;

        marker.bindPopup(`
            <strong>${location.name}</strong><br>
            Type: ${location.type}<br>
            Priority: ${location.priority}<br>
            ${bowser ? `Current Bowser: ${bowser.number}<br>
            Supply Level: ${deployment.supplyLevel}%` : 'No bowser deployed'}
        `);
    });
}

// Utility functions
function getStatusClass(status) {
    const classes = {
        deployed: 'success',
        maintenance: 'warning',
        standby: 'info'
    };
    return classes[status] || 'secondary';
}

function getSupplyLevelClass(level) {
    if (level >= 75) return 'success';
    if (level >= 50) return 'warning';
    return 'danger';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}
