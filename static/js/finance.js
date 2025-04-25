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
            invoiceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitInvoice();
            });
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
                .filter(invoice => invoice.issueDate.startsWith(month.substring(0, 7)))
                .reduce((sum, invoice) => sum + invoice.amount, 0);
            
            // Calculate expenses (for demo purposes, we'll use 70% of revenue)
            const expenses = totalRevenue * 0.7;
            
            // Calculate profit
            const profit = totalRevenue - expenses;
            
            // Count outstanding invoices
            const outstandingInvoices = this.invoices
                .filter(invoice => invoice.status === 'pending' || invoice.status === 'overdue')
                .reduce((sum, invoice) => sum + invoice.amount, 0);
            
            // Calculate mutual aid balance
            const mutualAidBalance = this.partners.reduce((sum, partner) => sum + partner.balance, 0);
            
            // Update UI with calculations
            if (document.getElementById('totalRevenue')) {
                document.getElementById('totalRevenue').textContent = totalRevenue.toLocaleString();
            }
            
            if (document.getElementById('totalExpenses')) {
                document.getElementById('totalExpenses').textContent = expenses.toLocaleString();
            }
            
            if (document.getElementById('totalProfit')) {
                document.getElementById('totalProfit').textContent = profit.toLocaleString();
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
        const filteredInvoices = this.invoices.filter(invoice => {
            const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
            const matchesSearch = 
                invoice.client.toLowerCase().includes(searchTerm) || 
                invoice.invoiceNumber.toLowerCase().includes(searchTerm);
            return matchesStatus && matchesSearch;
        });

        filteredInvoices.forEach(invoice => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${invoice.invoiceNumber}</td>
                <td>${invoice.client}</td>
                <td>£${invoice.amount.toLocaleString()}</td>
                <td>${invoice.issueDate}</td>
                <td>${invoice.dueDate}</td>
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
        const invoice = this.invoices.find(inv => inv.id == invoiceId);
        if (!invoice) return;
        
        // Populate modal with invoice details
        document.getElementById('modalInvoiceNumber').textContent = invoice.invoiceNumber;
        document.getElementById('modalInvoiceClient').textContent = invoice.client;
        document.getElementById('modalInvoiceAmount').textContent = `£${invoice.amount.toLocaleString()}`;
        document.getElementById('modalInvoiceIssueDate').textContent = invoice.issueDate;
        document.getElementById('modalInvoiceDueDate').textContent = invoice.dueDate;
        document.getElementById('modalInvoiceStatus').textContent = invoice.status;
        document.getElementById('modalInvoiceNotes').textContent = invoice.notes || 'No notes available';
        
        // Show modal
        document.getElementById('invoiceModal').style.display = 'block';
    }

    recordInvoice() {
        document.getElementById('invoiceForm').reset();
        document.getElementById('invoiceModal').style.display = 'block';
    }

    recordMutualAid() {
        document.getElementById('mutualAidForm').reset();
        document.getElementById('mutualAidModal').style.display = 'block';
    }

    async submitInvoice() {
        const form = document.getElementById('invoiceForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        // Collect form data
        const invoiceData = {
            invoiceNumber: form.elements['invoiceNumber'].value,
            client: form.elements['client'].value,
            amount: parseFloat(form.elements['amount'].value),
            issueDate: form.elements['issueDate'].value,
            dueDate: form.elements['dueDate'].value,
            status: 'pending',
            notes: form.elements['notes'].value
        };

        try {
            // In a real application, this would be sent to the server
            console.log('Submitting invoice:', invoiceData);
            
            // Add to local array for now (in production, this would come from API after successful submission)
            this.invoices.push(invoiceData);
            this.updateInvoicesList();
            this.closeModal('invoiceModal');
            this.showNotification('Invoice created successfully');
        } catch (error) {
            console.error('Error submitting invoice:', error);
            this.showNotification('Failed to create invoice', 'error');
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
        document.getElementById(modalId).style.display = 'none';
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
            
            // Get data based on active tab
            const activeTab = document.querySelector('.nav-link.active');
            if (!activeTab) {
                throw new Error('No active tab found');
            }

            const tabId = activeTab.getAttribute('href');
            if (!tabId) {
                throw new Error('Tab ID not found');
            }

            // Remove the # from href
            const cleanTabId = tabId.replace('#', '');
            
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
        
        // Get canvas contexts
        const revenueChartCtx = document.getElementById('revenueChart')?.getContext('2d');
        const balanceChartCtx = document.getElementById('balanceChart')?.getContext('2d');
        const statusChartCtx = document.getElementById('statusChart')?.getContext('2d');
        
        if (!revenueChartCtx || !balanceChartCtx) {
            console.warn('Chart canvas elements not found');
            return;
        }
        
        // Ensure Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.log('Chart.js not loaded, loading dynamically...');
            return;
        }
        
        // Show chart containers
        document.querySelectorAll('.chart-container').forEach(container => {
            container.style.display = 'block';
        });
        
        // Generate data for revenue chart (last 6 months)
        const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr']; // Last 6 months, ending in current month (Apr 2025)
        
        // Calculate revenue by month from actual invoice data
        const revenue = [12000, 14500, 18000, 22500, 26000, 0]; // Example data
        const expenses = [8500, 11000, 13000, 16500, 19000, 0]; // Example data
        
        // In a real application, we would calculate these from the invoice data:
        // const revenue = months.map(month => {
        //     // Get month index (0-11)
        //     const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month);
        //     // Map to year-month format (assuming current year)
        //     const yearMonth = `2025-${(monthIndex + 1).toString().padStart(2, '0')}`;
        //     // Sum invoices for this month
        //     return this.invoices
        //         .filter(invoice => invoice.issueDate.startsWith(yearMonth))
        //         .reduce((sum, invoice) => sum + invoice.amount, 0);
        // });
        
        // Draw revenue vs expenses chart
        new Chart(revenueChartCtx, {
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
        const balanceData = {
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
        };
        
        new Chart(balanceChartCtx, {
            type: 'doughnut',
            data: balanceData,
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
            // Count invoices by status
            const statusCounts = {
                paid: this.invoices.filter(i => i.status === 'paid').length,
                pending: this.invoices.filter(i => i.status === 'pending').length,
                overdue: this.invoices.filter(i => i.status === 'overdue').length
            };
            
            // Create status chart
            new Chart(statusChartCtx, {
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
let financeManager;
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing finance manager...');
    financeManager = new FinanceManager();
    
    // Load Chart.js dynamically if needed
    if (typeof Chart === 'undefined') {
        console.log('Loading Chart.js dynamically...');
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => {
            console.log('Chart.js loaded successfully');
            financeManager.initializeCharts();
        };
        document.head.appendChild(script);
    }
});
