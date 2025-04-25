// test_db_handler.js - Unit tests for db-handler.js
// Using Mocha, Chai, and Sinon for testing

describe('Database Handler', function() {
  // Setup
  let server;
  
  beforeEach(function() {
    // Create a fake server
    server = sinon.createFakeServer();
    server.autoRespond = true;
  });
  
  afterEach(function() {
    // Restore original functions
    server.restore();
  });
  
  // Test fetchData function
  describe('fetchData', function() {
    it('should fetch data from the API', function(done) {
      // Setup mock response
      const mockData = [
        { id: 1, name: 'Test Item 1' },
        { id: 2, name: 'Test Item 2' }
      ];
      
      server.respondWith('GET', '/api/test',
        [200, { 'Content-Type': 'application/json' }, JSON.stringify(mockData)]);
      
      // Call the function
      fetchData('/api/test')
        .then(function(data) {
          chai.expect(data).to.deep.equal(mockData);
          done();
        })
        .catch(function(error) {
          done(error);
        });
    });
    
    it('should handle API errors', function(done) {
      // Setup error response
      server.respondWith('GET', '/api/error',
        [500, { 'Content-Type': 'application/json' }, '{"error": "Server Error"}']);
      
      // Call the function
      fetchData('/api/error')
        .then(function() {
          done(new Error('Expected method to reject'));
        })
        .catch(function(error) {
          chai.expect(error).to.exist;
          done();
        });
    });
  });
  
  // Test postData function
  describe('postData', function() {
    it('should post data to the API', function(done) {
      // Setup data to post
      const postPayload = { name: 'New Item', status: 'active' };
      const mockResponse = { id: 3, name: 'New Item', status: 'active' };
      
      server.respondWith('POST', '/api/test',
        function(request) {
          // Check if the request body matches our payload
          const requestBody = JSON.parse(request.requestBody);
          chai.expect(requestBody).to.deep.equal(postPayload);
          
          request.respond(
            201,
            { 'Content-Type': 'application/json' },
            JSON.stringify(mockResponse)
          );
        });
      
      // Call the function
      postData('/api/test', postPayload)
        .then(function(data) {
          chai.expect(data).to.deep.equal(mockResponse);
          done();
        })
        .catch(function(error) {
          done(error);
        });
    });
    
    it('should handle validation errors', function(done) {
      // Setup error response for invalid data
      const invalidPayload = { name: '' }; // Missing required field
      
      server.respondWith('POST', '/api/test',
        [400, { 'Content-Type': 'application/json' }, '{"error": "Validation failed"}']);
      
      // Call the function
      postData('/api/test', invalidPayload)
        .then(function() {
          done(new Error('Expected method to reject'));
        })
        .catch(function(error) {
          chai.expect(error).to.exist;
          done();
        });
    });
  });
  
  // Test updateData function
  describe('updateData', function() {
    it('should update data via the API', function(done) {
      // Setup data to update
      const updatePayload = { id: 1, name: 'Updated Item', status: 'inactive' };
      
      server.respondWith('PUT', '/api/test/1',
        function(request) {
          // Check if the request body matches our payload
          const requestBody = JSON.parse(request.requestBody);
          chai.expect(requestBody).to.deep.equal(updatePayload);
          
          request.respond(
            200,
            { 'Content-Type': 'application/json' },
            JSON.stringify(updatePayload)
          );
        });
      
      // Call the function
      updateData('/api/test/1', updatePayload)
        .then(function(data) {
          chai.expect(data).to.deep.equal(updatePayload);
          done();
        })
        .catch(function(error) {
          done(error);
        });
    });
  });
  
  // Test deleteData function
  describe('deleteData', function() {
    it('should delete data via the API', function(done) {
      server.respondWith('DELETE', '/api/test/1',
        [200, { 'Content-Type': 'application/json' }, '{"success": true}']);
      
      // Call the function
      deleteData('/api/test/1')
        .then(function(data) {
          chai.expect(data.success).to.be.true;
          done();
        })
        .catch(function(error) {
          done(error);
        });
    });
    
    it('should handle deletion errors', function(done) {
      // Setup error response
      server.respondWith('DELETE', '/api/test/999',
        [404, { 'Content-Type': 'application/json' }, '{"error": "Item not found"}']);
      
      // Call the function
      deleteData('/api/test/999')
        .then(function() {
          done(new Error('Expected method to reject'));
        })
        .catch(function(error) {
          chai.expect(error).to.exist;
          done();
        });
    });
  });
  
  // Test loadBowserData function
  describe('loadBowserData', function() {
    it('should load and process bowser data', function(done) {
      // Setup mock bowser data
      const mockBowsers = [
        { id: 1, number: 'B001', capacity: 5000, current_level: 4000, status: 'active' },
        { id: 2, number: 'B002', capacity: 7500, current_level: 6000, status: 'maintenance' }
      ];
      
      // Create a mock table for testing
      const table = document.createElement('table');
      table.id = 'bowserTable';
      const tbody = document.createElement('tbody');
      table.appendChild(tbody);
      document.body.appendChild(table);
      
      // Setup mock response
      server.respondWith('GET', '/api/bowsers',
        [200, { 'Content-Type': 'application/json' }, JSON.stringify(mockBowsers)]);
      
      // Call the function
      loadBowserData()
        .then(function() {
          // Check if table was populated
          const rows = document.querySelectorAll('#bowserTable tbody tr');
          chai.expect(rows.length).to.equal(2);
          
          // Clean up
          document.body.removeChild(table);
          done();
        })
        .catch(function(error) {
          // Clean up
          document.body.removeChild(table);
          done(error);
        });
    });
  });
});
