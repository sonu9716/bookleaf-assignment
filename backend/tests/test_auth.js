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

const runTests = async () => {
  console.log('=== RUNNING AUTHENTICATION & RBAC REGRESSION TESTS ===\n');

  // Test 1: Author Login (Happy Path)
  console.log('Test 1: Author Login (Happy Path)');
  const authorLoginRes = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'anika.desai@email.com', password: 'bookleaf123' });
  console.log('Result:', authorLoginRes.statusCode === 200 ? 'PASS' : 'FAIL');
  const authorToken = authorLoginRes.body.token;

  // Test 2: Admin Login (Happy Path)
  console.log('\nTest 2: Admin Login (Happy Path)');
  const adminLoginRes = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'priya.sharma@bookleaf.in', password: 'bookleaf123' });
  console.log('Result:', adminLoginRes.statusCode === 200 ? 'PASS' : 'FAIL');
  const adminToken = adminLoginRes.body.token;

  // Test 3: Wrong Password
  console.log('\nTest 3: Wrong Password');
  const wrongPasswordRes = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'anika.desai@email.com', password: 'wrongpassword' });
  console.log('Status Code (expect 401):', wrongPasswordRes.statusCode);
  console.log('Result:', wrongPasswordRes.statusCode === 401 && wrongPasswordRes.body.error === 'Unauthorized' ? 'PASS' : 'FAIL');

  // Test 4: Role Isolation
  console.log('\nTest 4: Role Isolation - Accessing Books from /api/authors/me/books');
  const authorBooksRes = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/authors/me/books', method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authorToken}` }
  });
  const hasOnlyOwnBooks = authorBooksRes.body.every(b => b.title === 'Whispers of the Ganges' || b.title === 'The Saffron Diaries');
  console.log('Result:', authorBooksRes.statusCode === 200 && hasOnlyOwnBooks ? 'PASS' : 'FAIL');

  // Test 5: Admin accessing admin route /api/admin/tickets
  console.log('\nTest 5: Admin accessing admin route /api/admin/tickets');
  const adminTicketsRes = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/admin/tickets', method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('Result:', adminTicketsRes.statusCode === 200 ? 'PASS' : 'FAIL');

  // Test 6: Admin attempting to access author-only route /api/authors/me/books
  console.log('\nTest 6: Admin attempting to access author-only route /api/authors/me/books');
  const adminAuthorBooksRes = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/authors/me/books', method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('Result:', adminAuthorBooksRes.statusCode === 403 && adminAuthorBooksRes.body.error === 'Forbidden' ? 'PASS' : 'FAIL');

  // Test 7: Unauthenticated access
  console.log('\nTest 7: Unauthenticated Access to protected route');
  const unauthRes = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/authors/me/books', method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  console.log('Result:', unauthRes.statusCode === 401 && unauthRes.body.error === 'Unauthorized' ? 'PASS' : 'FAIL');
};

runTests().catch(console.error);
