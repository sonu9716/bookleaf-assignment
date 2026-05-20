const http = require('http');

const request = (options, postData) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) { req.write(JSON.stringify(postData)); }
    req.end();
  });
};

const runValidationTests = async () => {
  console.log('=== RUNNING API LAYER VALIDATION REGRESSION TESTS ===\n');

  // Login
  const authorLogin = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'anika.desai@email.com', password: 'bookleaf123' });
  const authorToken = authorLogin.body.token;

  // Test 29: Input Validation
  console.log('Test 29: Input Validation on Ticket Creation');
  const invalidTicketRes = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/authors/me/tickets', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authorToken}` }
  }, { subject: '', description: '' });

  const validationPass = invalidTicketRes.statusCode === 400 && 
                         invalidTicketRes.body.error === 'ValidationError' && 
                         Array.isArray(invalidTicketRes.body.details);
  console.log('Result:', validationPass ? 'PASS' : 'FAIL');

  // Test 30: Consistent error format on 404
  console.log('\nTest 30: Consistent error format on 404');
  const adminLogin = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'priya.sharma@bookleaf.in', password: 'bookleaf123' });
  const adminToken = adminLogin.body.token;

  const notFoundRes = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/admin/tickets/65bb1b2e88a0e998a111b222', method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  });

  const formatPass = notFoundRes.statusCode === 404 && notFoundRes.body.error === 'NotFound';
  console.log('Result:', formatPass ? 'PASS' : 'FAIL');
};

runValidationTests().catch(console.error);
