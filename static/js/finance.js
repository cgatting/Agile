/**
 * Finance Management System for AquaAlert
 * Handles invoicing, mutual aid scheme, and financial reporting
 * Uses real data from database via API endpoints
 */
class FinanceManager {
    constructor() {
        this.invoices = [];
        this.mutualAidTransactions = [];
        this.partners = [];
        // Initialize chart instance references
        this.revenueChart = null;
        this.balanceChart = null;
        this.statusChart = null;
        this.initializeData();
        this.initializeEventListeners();
    }

    async initializeData() {
        try {
            console.log('Initializing financial data from database...');
            // Show loading indicators
            if (document.getElementById('invoicesLoading')) {
                document.getElementById('invoicesLoading').style.display = 'flex';
            }
            if (document.getElementById('partnersLoading')) {
                document.getElementById('partnersLoading').style.display = 'flex';
            }
            if (document.getElementById('transactionsLoading')) {
                document.getElementById('transactionsLoading').style.display = 'flex';
            }
            
            // Load partners data from API
            console.log('Fetching partners data...');
            const partnerResponse = await fetch('/api/partners');
            if (!partnerResponse.ok) {
                throw new Error(`Failed to fetch partners: ${partnerResponse.status}`);
            }
            this.partners = await partnerResponse.json();
            console.log('Partners loaded:', this.partners);

            // Load invoices data from API
            console.log('Fetching invoices data...');
            const invoiceResponse = await fetch('/api/invoices');
            if (!invoiceResponse.ok) {
                throw new Error(`Failed to fetch invoices: ${invoiceResponse.status}`);
            }
            this.invoices = await invoiceResponse.json();
            console.log('Invoices loaded:', this.invoices);
            
            // Load mutual aid transactions data from API
            console.log('Fetching mutual aid transactions data...');
            const transactionResponse = await fetch('/api/mutual-aid/transactions');
            if (!transactionResponse.ok) {
                throw new Error(`Failed to fetch mutual aid transactions: ${transactionResponse.status}`);
            }
            this.mutualAidTransactions = await transactionResponse.json();
            console.log('Mutual aid transactions loaded:', this.mutualAidTransactions);
            
            // Update UI with data
            this.updateDisplay();
            
            // Initialize charts after data is loaded
            this.initializeCharts();
        } catch (error) {
            console.error('Error initializing data:', error);
            this.showNotification('Failed to load financial data. Using offline mode.', 'warning');
        } finally {
            // Hide loading indicators
            if (document.getElementById('invoicesLoading')) {
                document.getElementById('invoicesLoading').style.display = 'none';
            }
            if (document.getElementById('partnersLoading')) {
                document.getElementById('partnersLoading').style.display = 'none';
            }
            if (document.getElementById('transactionsLoading')) {
                document.getElementById('transactionsLoading').style.display = 'none';
            }
        }
    }

    initializeEventListeners() {
        // Financial month change
        const financialMonth = document.getElementById('financialMonth');
        if (financialMonth) {
            financialMonth.addEventListener('change', () => {
                this.updateFinancialOverview();
            });
        }

        // Modal close buttons
        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', () => {
                const modalId = button.closest('.modal').id;
                this.closeModal(modalId);
            });
        });

        // Export buttons
        document.querySelectorAll('button[data-format]').forEach(button => {
            button.addEventListener('click', () => {
                const format = button.dataset.format;
                this.exportData(format);
            });
        });

        // Form submission
        const invoiceForm = document.getElementById('invoiceForm');
        if (invoiceForm) {
            // Remove any existing listeners
            const newInvoiceForm = invoiceForm.cloneNode(true);
            invoiceForm.parentNode.replaceChild(newInvoiceForm, invoiceForm);
            
            // Add submit event listener to the form
            newInvoiceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitInvoice();
            });

            // Add click handler for the Create Invoice button
            const createButton = document.querySelector('#invoiceModal .btn-primary');
            if (createButton) {
                createButton.onclick = (e) => {
                    e.preventDefault();
                    this.submitInvoice();
                };
            }
        }

        const mutualAidForm = document.getElementById('mutualAidForm');
        if (mutualAidForm) {
            mutualAidForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitMutualAid();
            });
        }

        // Invoice list filters
        const invoiceStatusFilter = document.getElementById('invoiceStatusFilter');
        if (invoiceStatusFilter) {
            invoiceStatusFilter.addEventListener('change', () => this.updateInvoicesList());
        }
        
        const invoiceSearchInput = document.getElementById('invoiceSearchInput');
        if (invoiceSearchInput) {
            invoiceSearchInput.addEventListener('input', () => this.updateInvoicesList());
        }
        
        // Export data buttons
        document.querySelectorAll('button[data-format]').forEach(button => {
            button.addEventListener('click', () => {
                const format = button.getAttribute('data-format');
                this.exportData(format);
            });
        });
        
        // If export buttons are added dynamically after page load
        document.addEventListener('click', (e) => {
            if (e.target.matches('button[data-format]') || e.target.closest('button[data-format]')) {
                const button = e.target.matches('button[data-format]') ? e.target : e.target.closest('button[data-format]');
                const format = button.getAttribute('data-format');
                this.exportData(format);
            }
        });

        // New Invoice button
        const newInvoiceBtn = document.getElementById('newInvoiceBtn');
        if (newInvoiceBtn) {
            newInvoiceBtn.addEventListener('click', () => this.recordInvoice());
        }
        // Refresh Financial Overview
        const refreshBtn = document.getElementById('refreshFinancialData');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.updateDisplay());
        }
    }

    updateDisplay() {
        this.updateFinancialOverview();
        this.updateInvoicesList();
        this.updatePartnersList();
        this.updateTransactionsList();
    }

    updateFinancialOverview() {
        try {
            console.log('Updating financial overview...');
            // Get selected month for filtering
            const month = document.getElementById('financialMonth')?.value || '2025-04';
            
            // Calculate total revenue
            const totalRevenue = this.invoices
                .filter(invoice => invoice.issue_date.startsWith(month))
                .reduce((sum, invoice) => sum + invoice.amount, 0);
            
            // Calculate expenses (for demo purposes, we'll use 70% of revenue)
            const expenses = totalRevenue * 0.7;
            
            // Operating costs equals expenses

            // Count outstanding invoices
            const outstandingInvoices = this.invoices
                .filter(invoice => invoice.status === 'pending' || invoice.status === 'overdue')
                .reduce((sum, invoice) => sum + invoice.amount, 0);
            
            // Calculate mutual aid balance
            const mutualAidBalance = this.partners.reduce((sum, partner) => sum + (partner.balance || 0), 0);
            
            // Update UI with calculations
            if (document.getElementById('totalRevenue')) {
                document.getElementById('totalRevenue').textContent = totalRevenue.toLocaleString();
            }
            
            if (document.getElementById('operatingCosts')) {
                document.getElementById('operatingCosts').textContent = expenses.toLocaleString();
            }
            
            if (document.getElementById('outstandingInvoices')) {
                document.getElementById('outstandingInvoices').textContent = outstandingInvoices.toLocaleString();
            }
            
            if (document.getElementById('mutualAidBalance')) {
                document.getElementById('mutualAidBalance').textContent = mutualAidBalance.toLocaleString();
            }

            // Show charts
            document.querySelectorAll('.chart-container').forEach(container => {
                container.style.display = 'block';
            });
            
            console.log('Financial overview updated successfully');
        } catch (error) {
            console.error('Error updating financial overview:', error);
        }
    }

    updateInvoicesList() {
        const tbody = document.getElementById('invoicesList');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        // Get filter values
        const statusFilter = document.getElementById('invoiceStatusFilter')?.value || 'all';
        const searchTerm = document.getElementById('invoiceSearchInput')?.value?.toLowerCase() || '';
        
        // Filter invoices
        const filteredInvoices = this.invoices.filter(inv => {
            const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
            const clientName = inv.client_name || inv.client || '';
            const invoiceNum = inv.invoice_number || inv.invoiceNumber || '';
            const matchesSearch =
                clientName.toLowerCase().includes(searchTerm) ||
                invoiceNum.toLowerCase().includes(searchTerm);
            return matchesStatus && matchesSearch;
        });

        filteredInvoices.forEach(invoice => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${invoice.invoice_number || invoice.invoiceNumber}</td>
                <td>${invoice.client_name || invoice.client}</td>
                <td>£${invoice.amount.toLocaleString()}</td>
                <td>${invoice.issue_date ? invoice.issue_date.split('T')[0] : invoice.issueDate}</td>
                <td>${invoice.due_date || invoice.dueDate}</td>
                <td>
                    <span class="status-badge status-${invoice.status}">
                        ${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary view-invoice" data-id="${invoice.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary download-invoice" data-id="${invoice.id}">
                        <i class="fas fa-download"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        // Add event listeners to the new buttons
        document.querySelectorAll('.view-invoice').forEach(button => {
            button.addEventListener('click', () => {
                const invoiceId = button.getAttribute('data-id');
                this.viewInvoiceDetails(invoiceId);
            });
        });
        // Add event listeners for download-invoice buttons
        document.querySelectorAll('.download-invoice').forEach(button => {
            button.addEventListener('click', () => {
                const invoiceId = button.getAttribute('data-id');
                window.downloadInvoice(invoiceId);
            });
        });
    }

    updatePartnersList() {
        const container = document.getElementById('partnersList');
        if (!container) return;
        
        container.innerHTML = '';

        this.partners.forEach(partner => {
            const card = document.createElement('div');
            card.className = 'partner-card';
            card.innerHTML = `
                <h4>${partner.name}</h4>
                <p><strong>Contact:</strong> ${partner.contactPerson || 'N/A'}</p>
                <p><strong>Email:</strong> ${partner.email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${partner.phone || 'N/A'}</p>
                <p><strong>Balance:</strong> £${partner.balance.toLocaleString()}</p>
                <p><strong>Status:</strong> ${partner.status}</p>
                <button class="btn btn-sm btn-primary view-partner" data-id="${partner.id}">View Details</button>
            `;
            container.appendChild(card);
        });
        
        // Populate partner select dropdowns
        const selects = document.querySelectorAll('.partner-select');
        selects.forEach(select => {
            select.innerHTML = '<option value="">Select Partner</option>';
            this.partners.forEach(partner => {
                select.innerHTML += `<option value="${partner.id}">${partner.name}</option>`;
            });
        });
    }

    updateTransactionsList() {
        const tbody = document.getElementById('transactionsList');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        this.mutualAidTransactions.forEach(transaction => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${transaction.date}</td>
                <td>${transaction.partner}</td>
                <td>${transaction.type || 'contribution'}</td>
                <td>${transaction.resources || 'Financial'}</td>
                <td>£${transaction.amount.toLocaleString()}</td>
                <td>
                    <span class="status-badge status-${transaction.status || 'completed'}">
                        ${(transaction.status || 'completed').charAt(0).toUpperCase() + 
                         (transaction.status || 'completed').slice(1)}
                    </span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    viewInvoiceDetails(invoiceId) {
        const invoice = this.invoices.find(inv => inv.id === invoiceId);
        if (!invoice) return;

        // Force cleanup of any existing modals and backdrops
        const existingModals = document.querySelectorAll('.modal');
        existingModals.forEach(modal => {
            const instance = bootstrap.Modal.getInstance(modal);
            if (instance) {
                instance.dispose();
            }
        });
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';

        // Hide form and show details view
        document.getElementById('invoiceForm').style.display = 'none';
        const detailsView = document.getElementById('invoiceDetailsView');
        detailsView.style.display = 'block';

        // Populate details
        document.getElementById('modalInvoiceNumber').textContent = invoice.number || invoice.invoice_number;
        document.getElementById('modalInvoiceClient').textContent = invoice.clientName || invoice.client_name || invoice.client;
        document.getElementById('modalInvoiceAmount').textContent = `£${invoice.amount.toLocaleString()}`;
        document.getElementById('modalInvoiceIssueDate').textContent = invoice.issueDate || invoice.issue_date;
        document.getElementById('modalInvoiceDueDate').textContent = invoice.dueDate || invoice.due_date;
        document.getElementById('modalInvoiceStatus').textContent = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
        document.getElementById('modalInvoiceNotes').textContent = invoice.notes || 'No notes available';

        // Get modal element
        const modalEl = document.getElementById('invoiceModal');
        if (!modalEl) {
            console.error('Invoice modal element not found');
            return;
        }

        // Create new modal instance with modified configuration
        const modalInstance = new bootstrap.Modal(modalEl, {
            backdrop: false,  // Disable Bootstrap's built-in backdrop
            keyboard: true,
            focus: true
        });

        // Add custom backdrop
        const customBackdrop = document.createElement('div');
        customBackdrop.className = 'custom-modal-backdrop';
        customBackdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1040;
            pointer-events: none;
        `;
        document.body.appendChild(customBackdrop);

        // Set up cleanup
        modalEl.addEventListener('hidden.bs.modal', () => {
            customBackdrop.remove();
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }, { once: true });

        // Show the modal
        modalInstance.show();
    }

    recordInvoice() {
        // Force cleanup of any existing modals and backdrops
        const existingModals = document.querySelectorAll('.modal');
        existingModals.forEach(modal => {
            const instance = bootstrap.Modal.getInstance(modal);
            if (instance) {
                instance.dispose();
            }
        });
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';

        // Reset form and toggle views
        document.getElementById('invoiceForm').reset();
        document.getElementById('invoiceForm').style.display = 'block';
        document.getElementById('invoiceDetailsView').style.display = 'none';

        // Get modal element
        const modalEl = document.getElementById('invoiceModal');
        if (!modalEl) {
            console.error('Invoice modal element not found');
            return;
        }

        // Create new modal instance with modified configuration
        const modalInstance = new bootstrap.Modal(modalEl, {
            backdrop: false,  // Disable Bootstrap's built-in backdrop
            keyboard: true,
            focus: true
        });

        // Add custom backdrop
        const customBackdrop = document.createElement('div');
        customBackdrop.className = 'custom-modal-backdrop';
        customBackdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1040;
            pointer-events: none;
        `;
        document.body.appendChild(customBackdrop);

        // Set up cleanup
        modalEl.addEventListener('hidden.bs.modal', () => {
            customBackdrop.remove();
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }, { once: true });

        // Show the modal
        modalInstance.show();
    }

    recordMutualAid() {
        document.getElementById('mutualAidForm').reset();
        document.getElementById('mutualAidModal').style.display = 'block';
    }

    async submitInvoice() {
        try {
            const form = document.getElementById('invoiceForm');
            if (!form) {
                console.error('Invoice form not found');
                return;
            }

            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            // Collect form data
            const formData = new FormData(form);
            const invoiceData = {
                invoiceNumber: formData.get('invoiceNumber') || `INV-${new Date().getTime()}`,
                client: formData.get('client'),
                amount: parseFloat(formData.get('amount')),
                issueDate: formData.get('issueDate') || new Date().toISOString().split('T')[0],
                dueDate: formData.get('dueDate'),
                status: 'pending',
                notes: formData.get('notes') || '',
                id: `inv_${new Date().getTime()}`  // Generate a unique ID
            };

            // Validate required fields
            if (!invoiceData.client || !invoiceData.amount || !invoiceData.dueDate) {
                this.showNotification('Please fill in all required fields', 'error');
                return;
            }

            console.log('Submitting invoice:', invoiceData);
            
            // Add to local array (in production, this would be an API call)
            this.invoices.push(invoiceData);
            
            // Update the display
            this.updateInvoicesList();
            this.updateFinancialOverview();
            
            // Show success message
            this.showNotification('Invoice created successfully', 'success');
            
            // Close the modal
            this.closeModal('invoiceModal');
            
            // Reset the form
            form.reset();
            
        } catch (error) {
            console.error('Error submitting invoice:', error);
            this.showNotification('Failed to create invoice: ' + error.message, 'error');
        }
    }

    async submitMutualAid() {
        const form = document.getElementById('mutualAidForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Collect form data
        const transactionData = {
            partner: form.elements['partner'].value,
            type: form.elements['transactionType'].value,
            resources: form.elements['resources'].value,
            amount: parseFloat(form.elements['amount'].value),
            date: form.elements['date'].value,
            status: 'completed',
            notes: form.elements['notes'].value
        };

        try {
            // In a real application, this would be sent to the server
            console.log('Submitting mutual aid transaction:', transactionData);
            
            // Add to local array for now (in production, this would come from API)
            this.mutualAidTransactions.push(transactionData);
            this.updateTransactionsList();
            this.closeModal('mutualAidModal');
            this.showNotification('Mutual aid transaction recorded successfully');
        } catch (error) {
            console.error('Error submitting mutual aid transaction:', error);
            this.showNotification('Failed to record mutual aid transaction', 'error');
        }
    }

    closeModal(modalId) {
        try {
            // Get the modal element
            const modalEl = document.getElementById(modalId);
            if (!modalEl) return;

            // Remove custom backdrop if it exists
            const customBackdrop = document.querySelector('.custom-modal-backdrop');
            if (customBackdrop) {
                customBackdrop.remove();
            }

            // Remove any Bootstrap backdrops
            document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());

            // Get and dispose of the modal instance
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) {
                modalInstance.hide();
                modalInstance.dispose();
            }

            // Clean up modal-related classes and styles
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        } catch (error) {
            console.error('Error closing modal:', error);
            // Fallback cleanup
            document.querySelectorAll('.modal-backdrop, .custom-modal-backdrop').forEach(el => el.remove());
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
    }

    showNotification(message, type = 'success') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Show with animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
    
    async exportData(format) {
        try {
            let data;
            let filename;
            
            // Determine active finance tab
            const tabNav = document.getElementById('financeTab');
            const activeTabBtn = tabNav.querySelector('.nav-link.active');
            if (!activeTabBtn) throw new Error('No active finance tab found');
            // Use data-bs-target to identify pane
            let selector = activeTabBtn.getAttribute('data-bs-target') || activeTabBtn.getAttribute('href');
            if (!selector) throw new Error('Active tab target not found');
            const cleanTabId = selector.replace('#', '');
            
            // Get current date for filename
            const currentDate = new Date().toISOString().split('T')[0];

            switch (cleanTabId) {
                case 'invoices':
                    if (!this.invoices || !this.invoices.length) {
                        throw new Error('No invoice data available');
                    }
                    data = this.invoices;
                    filename = `aquaalert_invoices_${currentDate}`;
                    break;
                case 'partners':
                    if (!this.partners || !this.partners.length) {
                        throw new Error('No partner data available');
                    }
                    data = this.partners;
                    filename = `aquaalert_partners_${currentDate}`;
                    break;
                case 'transactions':
                    if (!this.mutualAidTransactions || !this.mutualAidTransactions.length) {
                        throw new Error('No transaction data available');
                    }
                    data = this.mutualAidTransactions;
                    filename = `aquaalert_transactions_${currentDate}`;
                    break;
                default:
                    throw new Error(`Invalid tab selected: ${cleanTabId}`);
            }

            console.log(`Exporting ${filename} in ${format} format...`);
            console.log('Data to export:', data);

            // Use the Utils.exportData function
            await Utils.exportData(data, format, filename);
        } catch (error) {
            const errorMessage = error.message || 'Unknown error occurred';
            console.error('Export failed:', error);
            this.showNotification(`Export failed: ${errorMessage}`, 'danger');
        }
    }
    
    exportAsPDF(data, filename) {
        // In a real application, you would use a library like jsPDF or pdfmake
        // For demo purposes, we'll create a simple HTML-based PDF export
        
        // Create a new window with formatted data
        const printWindow = window.open('', '_blank');
        
        // Determine which table structure to use based on data type
        const headers = Object.keys(data[0]).map(key => 
            key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
        );
        
        // Create HTML content
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${filename}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #2c3e50; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                    th { background-color: #3498db; color: white; }
                    tr:nth-child(even) { background-color: #f2f2f2; }
                    .logo { text-align: center; margin-bottom: 20px; }
                    .header { display: flex; justify-content: space-between; }
                    .footer { margin-top: 30px; text-align: center; font-size: 0.8em; color: #7f8c8d; }
                </style>
            </head>
            <body>
                <div class="logo">
                    <h1>AquaAlert Financial Report</h1>
                    <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            ${headers.map(header => `<th>${header}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(item => `
                            <tr>
                                ${Object.values(item).map(value => `<td>${value}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="footer">
                    <p>AquaAlert &copy; 2025 | Confidential Financial Information</p>
                </div>
                
                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
    }
    
    exportAsExcel(data, filename) {
        // In a real application, you would use a library like SheetJS (xlsx)
        // For this demo, we'll create a CSV and suggest opening it in Excel
        this.exportAsCSV(data, filename, true);
    }
    
    exportAsCSV(data, filename, isExcel = false) {
        // Convert the data array to CSV format
        const headers = Object.keys(data[0]);
        
        // Create CSV content
        let csvContent = headers.join(',') + '\n';
        
        // Add data rows
        data.forEach(item => {
            const row = headers.map(header => {
                // Handle values that might contain commas or quotes
                let value = item[header];
                if (value === null || value === undefined) {
                    return '';
                }
                value = String(value);
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csvContent += row.join(',') + '\n';
        });
        
        // Create a blob and download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${filename}.csv`);
        link.style.display = 'none';
        
        // Add to DOM, trigger download and clean up
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        if (isExcel) {
            this.showNotification('CSV file created. Open it with Excel to view as a spreadsheet.');
        }
    }

    initializeCharts() {
        console.log('Initializing charts with real data...');
        // Destroy previous chart instances to avoid canvas reuse errors
        if (this.revenueChart) this.revenueChart.destroy();
        if (this.balanceChart) this.balanceChart.destroy();
        if (this.statusChart) this.statusChart.destroy();

        // Get canvas contexts
        const revenueChartCtx = document.getElementById('revenueChart')?.getContext('2d');
        const balanceChartCtx = document.getElementById('balanceChart')?.getContext('2d');
        const statusChartCtx = document.getElementById('statusChart')?.getContext('2d');
        
        if (!revenueChartCtx || !balanceChartCtx) {
            console.warn('Revenue or balance chart canvas not found, skipping chart init');
            return;
        }
        
        // Ensure Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.log('Chart.js not loaded, loading dynamically...');
            return;
        }

        // Hide loading indicators
        document.querySelectorAll('.chart-loading').forEach(loader => loader.style.display = 'none');

        // Show chart containers
        document.querySelectorAll('.chart-container').forEach(container => container.style.display = 'block');
        
        // Generate data for revenue chart (last 6 months)
        const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr']; // Last 6 months, ending in current month (Apr 2025)
        const revenue = [12000, 14500, 18000, 22500, 26000, 0]; // Example data
        const expenses = [8500, 11000, 13000, 16500, 19000, 0]; // Example data
        
        // Draw revenue vs expenses chart
        this.revenueChart = new Chart(revenueChartCtx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Revenue',
                        data: revenue,
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Expenses',
                        data: expenses,
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '£' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
        
        // Draw mutual aid balance chart - using real partner data
        this.balanceChart = new Chart(balanceChartCtx, {
            type: 'doughnut',
            data: {
                labels: this.partners.map(p => p.name),
                datasets: [{
                    data: this.partners.map(p => Math.abs(p.balance)),
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': £' + context.raw.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
        
        // Add invoice status chart if element exists
        if (statusChartCtx) {
            const statusCounts = {
                paid: this.invoices.filter(i => i.status === 'paid').length,
                pending: this.invoices.filter(i => i.status === 'pending').length,
                overdue: this.invoices.filter(i => i.status === 'overdue').length
            };
            
            // Create status chart
            this.statusChart = new Chart(statusChartCtx, {
                type: 'pie',
                data: {
                    labels: ['Paid', 'Pending', 'Overdue'],
                    datasets: [{
                        data: [statusCounts.paid, statusCounts.pending, statusCounts.overdue],
                        backgroundColor: [
                            'rgba(75, 192, 192, 0.7)',
                            'rgba(255, 206, 86, 0.7)',
                            'rgba(255, 99, 132, 0.7)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
        
        console.log('Charts initialized successfully');
    }
}

// Initialize finance manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing finance manager...');
    window.financeManager = new FinanceManager();
    
    // Load Chart.js dynamically if needed
    if (typeof Chart === 'undefined') {
        console.log('Loading Chart.js dynamically...');
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => {
            console.log('Chart.js loaded successfully');
            window.financeManager.initializeCharts();
        };
        document.head.appendChild(script);
    } else {
        // Chart.js already loaded, initialize charts immediately
        window.financeManager.initializeCharts();
    }
});

// Global stub for viewing partner details
window.viewPartner = function(id) {
    const partner = window.financeManager.partners.find(p => p.id === id);
    if (partner) {
        alert(`Partner: ${partner.name}\nContact: ${partner.contact_person}\nEmail: ${partner.email}`);
    }
};

// Global stub for downloading invoice
window.downloadInvoice = function(id) {
    // Redirect to invoice download or preview
    window.open(`/finance/invoices/${id}`, '_blank');
};
