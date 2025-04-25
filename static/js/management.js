/**
 * Bowser Management functionality for the AquaAlert application
 * Uses data.js for data operations
 * Enhanced with modern UI elements and improved functionality
 */

import { DataManager } from './data.js';

class BowserManagement {
    constructor() {
        this.currentTab = 'all';
        this.bowsers = [];
        this.filteredBowsers = [];
        this.isLoading = false;
        this.currentBowser = null;
        this.dataManager = new DataManager();
        
        // Initialize when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => this.initialize());
    }
    
    /**
     * Initialize the management page
     */
    async initialize() {
        try {
            this.showLoading(true);
            
            // Load data from the database
            await this.dataManager.initializeData();
            
            // Get bowsers from the database handler
            this.bowsers = await this.dataManager.getBowsers();
            this.filteredBowsers = [...this.bowsers];
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initial render
            this.renderBowserGrid();
            
            this.showLoading(false);
            
            // Show welcome notification
            this.showToast('Bowser management loaded successfully', 'success');
        } catch (error) {
            console.error('Management initialization error:', error);
            this.showToast('Error loading bowser data', 'error');
            this.showLoading(false);
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchBowser');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.filterBowsers();
            });
        }
        
        // Filter dropdowns
        const statusFilter = document.getElementById('statusFilter');
        const locationFilter = document.getElementById('locationFilter');
        const capacityFilter = document.getElementById('capacityFilter');
        
        if (statusFilter) statusFilter.addEventListener('change', () => this.filterBowsers());
        if (locationFilter) locationFilter.addEventListener('change', () => this.filterBowsers());
        if (capacityFilter) capacityFilter.addEventListener('change', () => this.filterBowsers());
        
        // Add bowser button
        const addBowserBtn = document.getElementById('addBowserBtn');
        if (addBowserBtn) {
            addBowserBtn.addEventListener('click', () => this.openAddBowserModal());
        }
        
        // Empty state add button
        const emptyStateAddBtn = document.getElementById('emptyStateAddBtn');
        if (emptyStateAddBtn) {
            emptyStateAddBtn.addEventListener('click', () => this.openAddBowserModal());
        }
        
        // Modal close buttons
        const closeModal = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        if (closeModal) closeModal.addEventListener('click', () => this.closeAllModals());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeAllModals());
        
        // Details modal close buttons
        const closeDetailsModal = document.getElementById('closeDetailsModal');
        const closeDetailsBtn = document.getElementById('closeDetailsBtn');
        if (closeDetailsModal) closeDetailsModal.addEventListener('click', () => this.closeAllModals());
        if (closeDetailsBtn) closeDetailsBtn.addEventListener('click', () => this.closeAllModals());
        
        // Edit from details button
        const editFromDetailsBtn = document.getElementById('editFromDetailsBtn');
        if (editFromDetailsBtn) {
            editFromDetailsBtn.addEventListener('click', () => {
                if (this.currentBowser) {
                    this.closeAllModals();
                    this.openEditBowserModal(this.currentBowser.id);
                }
            });
        }
        
        // Save button
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.handleSaveBowser());
        }
        
        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });
    }
    
    /**
     * Show or hide loading indicator
     * @param {boolean} show - Whether to show or hide the loading indicator
     */
    showLoading(show) {
        this.isLoading = show;
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'flex' : 'none';
        }
    }
    
    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type of toast (success, error, warning, info)
     */
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Add appropriate icon based on type
        let icon = 'info-circle';
        switch (type) {
            case 'success': icon = 'check-circle'; break;
            case 'error': icon = 'exclamation-circle'; break;
            case 'warning': icon = 'exclamation-triangle'; break;
        }
        
        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <div class="toast-content">${message}</div>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `;
        
        toastContainer.appendChild(toast);
        
        // Add event listener to close button
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.classList.add('toast-hiding');
            setTimeout(() => {
                toast.remove();
            }, 300);
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('toast-hiding');
                setTimeout(() => {
                    if (toast.parentNode) toast.remove();
                }, 300);
            }
        }, 5000);
    }
    
    /**
     * Filter bowsers based on current filters
     */
    filterBowsers() {
        const searchTerm = document.getElementById('searchBowser')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const locationFilter = document.getElementById('locationFilter')?.value || '';
        const capacityFilter = document.getElementById('capacityFilter')?.value || '';
        
        this.filteredBowsers = this.bowsers.filter(bowser => {
            // Apply search filter
            if (searchTerm && !this.bowserMatchesSearch(bowser, searchTerm)) {
                return false;
            }
            
            // Apply status filter
            if (statusFilter && bowser.status !== statusFilter) {
                return false;
            }
            
            // Apply location filter
            if (locationFilter && (!bowser.location || bowser.location !== locationFilter)) {
                return false;
            }
            
            // Apply capacity filter
            if (capacityFilter) {
                const capacity = bowser.capacity;
                if (capacityFilter === 'small' && capacity >= 5000) {
                    return false;
                } else if (capacityFilter === 'medium' && (capacity < 5000 || capacity > 10000)) {
                    return false;
                } else if (capacityFilter === 'large' && capacity <= 10000) {
                    return false;
                }
            }
            
            // Bowser passed all filters
            return true;
        });
        
        // Update grid and show empty state if needed
        this.renderBowserGrid();
        
        // Show or hide empty state
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
            emptyState.style.display = this.filteredBowsers.length === 0 ? 'flex' : 'none';
        }
    }
    
    /**
     * Check if bowser matches the search term
     * @param {Object} bowser - Bowser object
     * @param {string} searchTerm - Search term
     * @returns {boolean} True if bowser matches search term
     */
    bowserMatchesSearch(bowser, searchTerm) {
        const searchableFields = [
            bowser.id,
            bowser.number,
            bowser.owner,
            bowser.manufacturer,
            bowser.model,
            bowser.notes,
            this.formatStatus(bowser.status)
        ];
        
        return searchableFields.some(field => {
            return field && field.toString().toLowerCase().includes(searchTerm);
        });
    }
    
    /**
     * Render the bowser grid with filtered bowsers
     */
    renderBowserGrid() {
        const container = document.getElementById('bowserGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (!container || !emptyState) return;
        
        // Show/hide empty state
        if (this.filteredBowsers.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'flex';
            return;
        } else {
            container.style.display = 'grid';
            emptyState.style.display = 'none';
        }
        
        // Clear container
        container.innerHTML = '';
        
        // Create bowser cards
        this.filteredBowsers.forEach(bowser => {
            const card = document.createElement('div');
            card.className = 'bowser-card';
            card.dataset.bowserId = bowser.id;
            
            // Get status color
            const statusClass = this.getStatusClass(bowser.status);
            
            // Get water level percentage
            const waterLevel = Math.round((bowser.currentLevel / bowser.capacity) * 100);
            
            // Check if bowser is deployed
            const deployment = this.dataManager.getDeploymentByBowserId(bowser.id);
            const isDeployed = deployment !== null;
            card.dataset.isDeployed = isDeployed;
            
            const location = deployment && deployment.locationId ? 
                this.dataManager.getLocationById(deployment.locationId)?.name || 'Not assigned' : 'Not assigned';
            
            // Create the HTML structure for the card
            let cardHTML = `
            <div class="bowser-card-header ${statusClass}">
                <h3>${bowser.number}</h3>
                <span class="status-badge">${this.formatStatus(bowser.status)}</span>
            </div>
            <div class="bowser-card-body">
                <div class="info-row">
                    <i class="fas fa-tint"></i>
                    <span>Capacity: ${bowser.capacity.toLocaleString()} L</span>
                </div>
                <div class="info-row">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>Location: ${location}</span>
                </div>
                <div class="info-row">
                    <i class="fas fa-user"></i>
                    <span>Owner: ${bowser.owner || 'Unassigned'}</span>
                </div>
                <div class="water-level-container">
                    <div class="water-level-text">
                        Water Level: ${waterLevel}%
                    </div>
                    <div class="water-level-bar">
                        <div class="water-level-fill" style="width: ${waterLevel}%"></div>
                    </div>
                    <div class="water-level-amount">
                        ${bowser.currentLevel.toLocaleString()} / ${bowser.capacity.toLocaleString()} L
                    </div>
                </div>
            </div>
            <div class="bowser-card-footer">
                <button class="btn btn-icon btn-details" title="View Details"><i class="fas fa-info-circle"></i> Details</button>
                <button class="btn btn-icon btn-edit" title="Edit Bowser"><i class="fas fa-edit"></i> Edit</button>`;
            
            // Add deploy or undeploy button based on current status
            if (isDeployed) {
                cardHTML += `<button class="btn btn-icon btn-undeploy" title="Undeploy Bowser"><i class="fas fa-truck-loading"></i> Undeploy</button>`;
            } else {
                cardHTML += `<button class="btn btn-icon btn-deploy" title="Deploy Bowser"><i class="fas fa-truck"></i> Deploy</button>`;
            }
            
            // Close the footer div
            cardHTML += `</div>`;
            
            // Set the card's HTML
            card.innerHTML = cardHTML;
            
            // Add the card to the container
            container.appendChild(card);
        });
        
        // Add event listeners to all card buttons
        this.addBowserCardEventListeners();
    }
    
    /**
     * Add event listeners to bowser card buttons
     */
    addBowserCardEventListeners() {
        // Get all cards
        const cards = document.querySelectorAll('.bowser-card');
        console.log(`Adding event listeners to ${cards.length} bowser cards`);
        
        // Add event listeners to each card
        cards.forEach(card => {
            const bowserId = card.dataset.bowserId;
            const isDeployed = card.dataset.isDeployed === 'true';
            console.log(`Setting up card with bowserId: ${bowserId}, isDeployed: ${isDeployed}`);
            
            // Details button
            const detailsBtn = card.querySelector('.btn-details');
            if (detailsBtn) {
                detailsBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`Details button clicked for bowser: ${bowserId}`);
                    this.showBowserDetails(bowserId);
                });
            }
            
            // Edit button
            const editBtn = card.querySelector('.btn-edit');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`Edit button clicked for bowser: ${bowserId}`);
                    this.openEditBowserModal(bowserId);
                });
            }
            
            // Deploy button
            const deployBtn = card.querySelector('.btn-deploy');
            if (deployBtn) {
                deployBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`Deploy button clicked for bowser: ${bowserId}`);
                    this.deployBowser(bowserId);
                });
            }
            
            // Undeploy button
            const undeployBtn = card.querySelector('.btn-undeploy');
            if (undeployBtn) {
                undeployBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`Undeploy button clicked for bowser: ${bowserId}`);
                    this.undeployBowser(bowserId);
                });
            }
        });
    }
    
    /**
     * Format status text for display
     * @param {string} status - Status code
     * @returns {string} Formatted status text
     */
    formatStatus(status) {
        switch (status) {
            case 'active':
                return 'Active';
            case 'maintenance':
                return 'In Maintenance';
            case 'inactive':
                return 'Inactive';
            case 'deployed':
                return 'Deployed';
            case 'standby':
                return 'Standby';
            default:
                return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
        }
    }
    
    /**
     * Get CSS class for status
     * @param {string} status - Status code
     * @returns {string} CSS class for the status
     */
    getStatusClass(status) {
        switch (status) {
            case 'active':
                return 'status-active';
            case 'maintenance':
                return 'status-maintenance';
            case 'inactive':
                return 'status-inactive';
            case 'deployed':
                return 'status-deployed';
            case 'standby':
                return 'status-standby';
            default:
                return 'status-unknown';
        }
    }
    
    /**
     * Open the add bowser modal
     */
    openAddBowserModal() {
        // Reset form and set title
        const modal = document.getElementById('bowserModal');
        const form = document.getElementById('bowserForm');
        const modalTitle = document.getElementById('modalTitle');
        
        if (modal && form && modalTitle) {
            modalTitle.textContent = 'Add New Bowser';
            form.reset();
            
            // Set default values
            const currentLevelInput = document.getElementById('bowserCurrentLevel');
            const capacityInput = document.getElementById('bowserCapacity');
            if (currentLevelInput && capacityInput) {
                // Listen for capacity changes to update current level
                capacityInput.addEventListener('change', () => {
                    if (capacityInput.value) {
                        currentLevelInput.value = capacityInput.value;
                    }
                }, { once: true });
            }
            
            // Set today's date for last maintenance
            const maintenanceInput = document.getElementById('bowserLastMaintenance');
            if (maintenanceInput) {
                const today = new Date().toISOString().split('T')[0];
                maintenanceInput.value = today;
            }
            
            // Clear current bowser so we know we're adding new
            this.currentBowser = null;
            
            // Show the modal
            modal.style.display = 'flex';
        }
    }
    
    /**
     * Show bowser details in modal
     * @param {string} bowserId - ID of the bowser
     */
    showBowserDetails(bowserId) {
        // Find the bowser by ID using the database handler
        const bowser = this.dataManager.getBowserById(bowserId);
        if (!bowser) {
            this.showToast('Bowser not found', 'error');
            return;
        }
        
        // Save reference to current bowser
        this.currentBowser = bowser;
        
        // Get maintenance records for this bowser
        const maintenanceRecords = this.dataManager.getMaintenanceRecordsByBowserId(bowserId);
        
        // Find latest maintenance record
        const maintenance = maintenanceRecords && maintenanceRecords.length > 0 ? 
            maintenanceRecords.sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))[0] : null;
        
        // Find active deployment if any
        const activeDeployment = this.dataManager.getDeploymentByBowserId(bowserId);
        
        // Find location if deployed
        let location = null;
        if (activeDeployment && activeDeployment.locationId) {
            location = this.dataManager.getLocationById(activeDeployment.locationId);
        }
        
        // Calculate water level percentage
        const waterLevel = bowser.currentLevel / bowser.capacity * 100;
        
        // Populate modal content
        const detailsModal = document.getElementById('detailsModal');
        const detailsContent = document.getElementById('bowserDetailsContent');
        
        if (!detailsModal || !detailsContent) {
            this.showToast('Details modal not found in the DOM', 'error');
            return;
        }
        
        detailsContent.innerHTML = `
            <div class="bowser-details">
                <div class="details-header">
                    <h3>${bowser.number}</h3>
                    <span class="bowser-status ${this.getStatusClass(bowser.status)}">${this.formatStatus(bowser.status)}</span>
                </div>
                
                <div class="details-section">
                    <h4>Bowser Information</h4>
                    <div class="details-grid">
                        <div class="details-item">
                            <span class="details-label">ID</span>
                            <span class="details-value">${bowser.id}</span>
                        </div>
                        <div class="details-item">
                            <span class="details-label">Capacity</span>
                            <span class="details-value">${bowser.capacity.toLocaleString()} L</span>
                        </div>
                        <div class="details-item">
                            <span class="details-label">Current Level</span>
                            <span class="details-value">${bowser.currentLevel.toLocaleString()} L (${Math.round(waterLevel)}%)</span>
                        </div>
                        <div class="details-item">
                            <span class="details-label">Owner</span>
                            <span class="details-value">${bowser.owner || 'Unassigned'}</span>
                        </div>
                        <div class="details-item">
                            <span class="details-label">Last Maintenance</span>
                            <span class="details-value">${bowser.lastMaintenance || 'Not recorded'}</span>
                        </div>
                        <div class="details-item">
                            <span class="details-label">Notes</span>
                            <span class="details-value">${bowser.notes || 'No notes'}</span>
                        </div>
                    </div>
                </div>
                
                ${activeDeployment ? `
                <div class="details-section">
                    <h4>Current Deployment</h4>
                    <div class="details-grid">
                        <div class="details-item">
                            <span class="details-label">Deployment ID</span>
                            <span class="details-value">${activeDeployment.id}</span>
                        </div>
                        <div class="details-item">
                            <span class="details-label">Location</span>
                            <span class="details-value">${location ? location.name : 'Unknown'}</span>
                        </div>
                        <div class="details-item">
                            <span class="details-label">Address</span>
                            <span class="details-value">${location ? location.address : 'Unknown'}</span>
                        </div>
                        <div class="details-item">
                            <span class="details-label">Start Date</span>
                            <span class="details-value">${activeDeployment.startDate || 'Not recorded'}</span>
                        </div>
                        <div class="details-item">
                            <span class="details-label">End Date</span>
                            <span class="details-value">${activeDeployment.endDate || 'Ongoing'}</span>
                        </div>
                        <div class="details-item">
                            <span class="details-label">Status</span>
                            <span class="details-value">${activeDeployment.status || 'Active'}</span>
                        </div>
                        <div class="details-item">
                            <span class="details-label">Notes</span>
                            <span class="details-value">${activeDeployment.notes || 'No notes'}</span>
                        </div>
                    </div>
                    <div class="details-actions">
                        <button id="endDeploymentBtn" class="btn btn-warning">End Deployment</button>
                    </div>
                </div>
                ` : ''}
                
                ${maintenance ? `
                <div class="details-section">
                    <h4>Latest Maintenance</h4>
                    <div class="details-grid">
                        <div class="details-item">
                            <span class="details-label">Type</span>
                            <span class="details-value">${maintenance.type}</span>
                        </div>
                        <div class="details-item">
                            <span class="details-label">Description</span>
                            <span class="details-value">${maintenance.description}</span>
                        </div>
                        <div class="details-item">
                            <span class="details-label">Scheduled Date</span>
                            <span class="details-value">${Utils.formatDate(maintenance.scheduledDate)}</span>
                        </div>
                        <div class="details-item">
                            <span class="details-label">Status</span>
                            <span class="details-value">${maintenance.status}</span>
                        </div>
                        <div class="details-item">
                            <span class="details-label">Assigned To</span>
                            <span class="details-value">${maintenance.assignedTo}</span>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                <div class="details-actions">
                    <button class="secondary-btn close-details">Close</button>
                    <button class="primary-btn edit-details" data-id="${bowser.id}">
                        <i class="fas fa-edit"></i> Edit Bowser
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners to the modal buttons
        const closeButton = detailsContent.querySelector('.close-details');
        closeButton.addEventListener('click', () => this.closeAllModals());
        
        const editButton = detailsContent.querySelector('.edit-details');
        editButton.addEventListener('click', () => {
            this.closeAllModals();
            this.openEditBowserModal(bowserId);
        });
        
        // Add event listener to End Deployment button if it exists
        const endDeploymentBtn = detailsContent.querySelector('#endDeploymentBtn');
        if (endDeploymentBtn) {
            endDeploymentBtn.addEventListener('click', () => {
                this.closeAllModals();
                this.undeployBowser(bowserId);
            });
        }
        
        // Show the modal
        const modal = document.getElementById('bowserDetailsModal');
        modal.style.display = 'block';
    }
    
    /**
     * Handle saving a bowser (add new or update existing)
     */
    async handleSaveBowser() {
        try {
            this.showLoading(true);
            
            // Get form values
            const id = document.getElementById('bowserId').value.trim();
            const capacity = parseInt(document.getElementById('bowserCapacity').value) || 0;
            const currentLevel = parseInt(document.getElementById('bowserCurrentLevel').value) || 0;
            const owner = document.getElementById('bowserOwner').value.trim();
            const location = document.getElementById('bowserLocation').value;
            const status = document.getElementById('bowserStatus').value;
            const lastMaintenance = document.getElementById('bowserLastMaintenance').value;
            const notes = document.getElementById('bowserNotes').value.trim();
            
            // Validation
            if (!id) {
                this.showToast('Bowser ID is required', 'error');
                this.showLoading(false);
                return;
            }
            
            if (capacity <= 0) {
                this.showToast('Capacity must be greater than zero', 'error');
                this.showLoading(false);
                return;
            }
            
            // Create bowser object
            const bowserData = {
                id: id,
                capacity: capacity,
                currentLevel: currentLevel,
                owner: owner,
                location: location,
                status: status,
                lastMaintenance: lastMaintenance,
                nextMaintenance: lastMaintenance ? new Date(new Date(lastMaintenance).setMonth(new Date(lastMaintenance).getMonth() + 3)).toISOString().split('T')[0] : null,
                notes: notes
            };
            
            // Determine if this is an add or update operation
            if (this.currentBowser) {
                // Update existing bowser
                await this.dataManager.updateBowser(id, bowserData);
                this.showToast(`Bowser ${id} updated successfully`, 'success');
            } else {
                // Check if bowser with this ID already exists
                const existingBowser = this.dataManager.getBowserById(id);
                if (existingBowser) {
                    this.showToast(`Bowser with ID ${id} already exists`, 'error');
                    this.showLoading(false);
                    return;
                }
                
                // Add new bowser
                await this.dataManager.addBowser(bowserData);
                this.showToast(`Bowser ${id} added successfully`, 'success');
            }
            
            // Close modal and refresh data
            this.closeAllModals();
            await this.initialize();
            
        } catch (error) {
            console.error('Error saving bowser:', error);
            this.showToast('Error saving bowser: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * Deploy a bowser to a location
     * @param {string} bowserId - ID of the bowser to deploy
     */
    async deployBowser(bowserId) {
        try {
            this.showLoading(true);
            
            // Get the bowser
            const bowser = this.dataManager.getBowserById(bowserId);
            if (!bowser) {
                this.showToast('Bowser not found', 'error');
                this.showLoading(false);
                return;
            }
            
            // Check if bowser is already deployed
            const existingDeployment = this.dataManager.getDeploymentByBowserId(bowserId);
            if (existingDeployment) {
                this.showToast(`Bowser ${bowser.number} is already deployed`, 'warning');
                return;
            }
            
            // Get available locations
            
            const locations = this.dataManager.getLocations();
            locations.forEach(location => {
                const option = document.createElement('option');
                option.value = location.id;
                option.textContent = location.name;
                locationSelect.appendChild(option);
            });
            
            // Set default start date to today
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('deployStartDate').value = today;
            
            // Show modal
            modal.style.display = 'block';
            
            this.showLoading(false);
        } catch (error) {
            console.error('Error preparing deployment:', error);
            this.showToast('Error preparing deployment: ' + error.message, 'error');
            this.showLoading(false);
        }
    }
    
    /**
     * Undeploy a bowser from its current location
     * @param {string} bowserId - ID of the bowser to undeploy
     */
    async undeployBowser(bowserId) {
        try {
            this.showLoading(true);
            
            // Get the bowser
            const bowser = this.dataManager.getBowserById(bowserId);
            if (!bowser) {
                this.showToast('Bowser not found', 'error');
                this.showLoading(false);
                return;
            }
            
            // Get the deployment
            const deployment = this.dataManager.getDeploymentByBowserId(bowserId);
            if (!deployment) {
                this.showToast('Bowser is not currently deployed', 'warning');
                this.showLoading(false);
                return;
            }
            
            // Get location name for confirmation message
            let locationName = 'its current location';
            if (deployment.locationId) {
                const location = this.dataManager.getLocationById(deployment.locationId);
                if (location) {
                    locationName = location.name;
                }
            }
            
            // Confirm with user
            if (!confirm(`Are you sure you want to undeploy Bowser ${bowser.number} from ${locationName}?`)) {
                this.showLoading(false);
                return;
            }
            
            // End the deployment by updating its status and end date
            deployment.status = 'completed';
            deployment.endDate = new Date().toISOString().split('T')[0]; // Today's date
            await this.dataManager.updateDeployment(deployment.id, deployment);
            
            // Update bowser status to available
            bowser.status = 'available';
            await this.dataManager.updateBowser(bowserId, bowser);
            
            // Show success message
            this.showToast(`Bowser ${bowser.number} has been successfully undeployed from ${locationName}`, 'success');
            
            // Refresh the data
            await this.initialize();
            
        } catch (error) {
            console.error('Error undeploying bowser:', error);
            this.showToast('Error undeploying bowser: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * Delete a bowser
     * @param {string} bowserId - ID of the bowser to delete
     */
    async deleteBowser(bowserId) {
        try {
            if (!confirm('Are you sure you want to delete this bowser? This action cannot be undone.')) {
                return;
            }
            
            this.showLoading(true);
            
            // Get the bowser
            const bowser = this.dataManager.getBowserById(bowserId);
            if (!bowser) {
                this.showToast('Bowser not found', 'error');
                this.showLoading(false);
                return;
            }
            
            // Delete the bowser
            await this.dataManager.deleteBowser(bowserId);
            
            // Close any open modals
            this.closeAllModals();
            
            // Refresh the data
            await this.initialize();
            
            // Show success message
            this.showToast(`Bowser ${bowserId} deleted successfully`, 'success');
        } catch (error) {
            console.error('Error deleting bowser:', error);
            this.showToast('Error deleting bowser: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * Close all modals
     */
    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        
        // Reset form fields
        const bowserIdField = document.getElementById('bowserId');
        if (bowserIdField) bowserIdField.disabled = false;
        
        // Clear current bowser reference
        this.currentBowser = null;
    }
    
    /**
     * Handle deployment form submission
     */
    async handleDeployment() {
        try {
            this.showLoading(true);
            
            // Get form values
            const bowserId = document.getElementById('deployBowserId').value;
            const locationId = document.getElementById('deployLocation').value;
            const startDate = document.getElementById('deployStartDate').value;
            const endDate = document.getElementById('deployEndDate').value || null;
            const notes = document.getElementById('deployNotes').value;
            
            // Validate form
            if (!locationId) {
                this.showToast('Please select a location', 'error');
                this.showLoading(false);
                return;
            }
            
            if (!startDate) {
                this.showToast('Please select a start date', 'error');
                this.showLoading(false);
                return;
            }
            
            // Create deployment object
            const deployment = {
                bowserId: bowserId,
                locationId: locationId,
                startDate: startDate,
                endDate: endDate,
                notes: notes,
                status: 'active'
            };
            
            // Create deployment
            await this.dataManager.createDeployment(deployment);
            
            // Update bowser status
            const bowser = this.dataManager.getBowserById(bowserId);
            if (bowser) {
                bowser.status = 'deployed';
                await this.dataManager.updateBowser(bowserId, bowser);
            }
            
            // Close modal and refresh data
            this.closeAllModals();
            this.showToast(`Bowser ${bowserId} deployed successfully`, 'success');
            
            // Refresh display
            await this.initialize();
            
        } catch (error) {
            console.error('Error deploying bowser:', error);
            this.showToast('Error deploying bowser: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }
}

// Initialize bowser management
const bowserManagement = new BowserManagement();
