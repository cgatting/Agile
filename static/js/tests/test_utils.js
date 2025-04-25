// test_utils.js - Unit tests for utils.js
// Using Mocha and Chai for testing

describe('Utility Functions', function() {
  
  // Test formatDate function
  describe('formatDate', function() {
    it('should format a date string correctly', function() {
      const date = new Date('2025-04-08T12:00:00');
      const formattedDate = formatDate(date);
      chai.expect(formattedDate).to.equal('08/04/2025');
    });
    
    it('should handle null or undefined dates', function() {
      chai.expect(formatDate(null)).to.equal('N/A');
      chai.expect(formatDate(undefined)).to.equal('N/A');
    });
  });
  
  // Test formatCurrency function
  describe('formatCurrency', function() {
    it('should format a number as currency', function() {
      chai.expect(formatCurrency(1000)).to.equal('£1,000.00');
      chai.expect(formatCurrency(1234.56)).to.equal('£1,234.56');
    });
    
    it('should handle zero values', function() {
      chai.expect(formatCurrency(0)).to.equal('£0.00');
    });
    
    it('should handle negative values', function() {
      chai.expect(formatCurrency(-1000)).to.equal('-£1,000.00');
    });
  });
  
  // Test validateForm function
  describe('validateForm', function() {
    // Setup a mock form for testing
    beforeEach(function() {
      // Create a test form
      const form = document.createElement('form');
      form.id = 'testForm';
      
      // Add some inputs
      const input1 = document.createElement('input');
      input1.type = 'text';
      input1.name = 'testInput1';
      input1.required = true;
      
      const input2 = document.createElement('input');
      input2.type = 'email';
      input2.name = 'testInput2';
      input2.required = true;
      
      form.appendChild(input1);
      form.appendChild(input2);
      document.body.appendChild(form);
    });
    
    afterEach(function() {
      // Clean up
      const form = document.getElementById('testForm');
      if (form) {
        document.body.removeChild(form);
      }
    });
    
    it('should return false for an empty required field', function() {
      const form = document.getElementById('testForm');
      const input1 = form.elements['testInput1'];
      input1.value = '';
      
      chai.expect(validateForm(form)).to.be.false;
    });
    
    it('should return false for an invalid email', function() {
      const form = document.getElementById('testForm');
      const input1 = form.elements['testInput1'];
      const input2 = form.elements['testInput2'];
      
      input1.value = 'Test Value';
      input2.value = 'not-an-email';
      
      chai.expect(validateForm(form)).to.be.false;
    });
    
    it('should return true for a valid form', function() {
      const form = document.getElementById('testForm');
      const input1 = form.elements['testInput1'];
      const input2 = form.elements['testInput2'];
      
      input1.value = 'Test Value';
      input2.value = 'test@example.com';
      
      chai.expect(validateForm(form)).to.be.true;
    });
  });
  
  // Test calculateWaterLevels function
  describe('calculateWaterLevels', function() {
    it('should calculate the correct percentage', function() {
      chai.expect(calculateWaterLevel(7500, 10000)).to.equal(75);
      chai.expect(calculateWaterLevel(0, 5000)).to.equal(0);
      chai.expect(calculateWaterLevel(5000, 5000)).to.equal(100);
    });
    
    it('should handle invalid inputs', function() {
      chai.expect(calculateWaterLevel(-100, 5000)).to.equal(0);
      chai.expect(calculateWaterLevel(6000, 5000)).to.equal(100); // Cap at 100%
      chai.expect(calculateWaterLevel(1000, 0)).to.equal(0); // Avoid division by zero
    });
  });
  
  // Test filterTable function
  describe('filterTable', function() {
    beforeEach(function() {
      // Create a test table
      const table = document.createElement('table');
      table.id = 'testTable';
      
      // Add table header
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      const th1 = document.createElement('th');
      th1.textContent = 'Name';
      const th2 = document.createElement('th');
      th2.textContent = 'Status';
      
      headerRow.appendChild(th1);
      headerRow.appendChild(th2);
      thead.appendChild(headerRow);
      table.appendChild(thead);
      
      // Add table body
      const tbody = document.createElement('tbody');
      
      // Row 1
      const row1 = document.createElement('tr');
      const td1_1 = document.createElement('td');
      td1_1.textContent = 'Bowser 1';
      const td1_2 = document.createElement('td');
      td1_2.textContent = 'active';
      row1.appendChild(td1_1);
      row1.appendChild(td1_2);
      
      // Row 2
      const row2 = document.createElement('tr');
      const td2_1 = document.createElement('td');
      td2_1.textContent = 'Bowser 2';
      const td2_2 = document.createElement('td');
      td2_2.textContent = 'maintenance';
      row2.appendChild(td2_1);
      row2.appendChild(td2_2);
      
      tbody.appendChild(row1);
      tbody.appendChild(row2);
      table.appendChild(tbody);
      
      document.body.appendChild(table);
    });
    
    afterEach(function() {
      // Clean up
      const table = document.getElementById('testTable');
      if (table) {
        document.body.removeChild(table);
      }
    });
    
    it('should filter table rows correctly', function() {
      const table = document.getElementById('testTable');
      
      // Filter for 'active'
      filterTable(table, 'active');
      
      // Check that only the active row is visible
      const rows = table.querySelectorAll('tbody tr');
      chai.expect(rows[0].style.display).to.not.equal('none');
      chai.expect(rows[1].style.display).to.equal('none');
    });
    
    it('should show all rows when filter is empty', function() {
      const table = document.getElementById('testTable');
      
      // Apply empty filter
      filterTable(table, '');
      
      // Check that all rows are visible
      const rows = table.querySelectorAll('tbody tr');
      chai.expect(rows[0].style.display).to.not.equal('none');
      chai.expect(rows[1].style.display).to.not.equal('none');
    });
  });
});
