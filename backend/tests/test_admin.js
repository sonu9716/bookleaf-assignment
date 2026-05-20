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
  console.log('=== RUNNING ADMIN PORTAL REGRESSION TESTS ===\n');

  // Step 1: Login as Admin & Author
  const adminLogin = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'priya.sharma@bookleaf.in', password: 'bookleaf123' });
  const adminToken = adminLogin.body.token;
  const adminId = adminLogin.body.user.id;

  const authorLogin = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'anika.desai@email.com', password: 'bookleaf123' });
  const authorToken = authorLogin.body.token;

  // Test 16: Ticket Queue
  console.log('Test 16: Ticket Queue Fetching');
  const queueRes = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/admin/tickets', method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('Result:', queueRes.body.length > 0 ? 'PASS' : 'FAIL');

  // Test 17: Filtering
  console.log('\nTest 17: Filter by status = "Open"');
  const openQueueRes = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/admin/tickets?status=Open', method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  });
  const allOpen = openQueueRes.body.every(t => t.status === 'Open');
  console.log('Result:', allOpen ? 'PASS' : 'FAIL');

  const targetTicket = openQueueRes.body[0];

  // Test 18: Admin Ticket Detail & Notes Isolation
  console.log('\nTest 18: Admin Ticket Detail Fetch');
  const detailRes = await request({
    hostname: '127.0.0.1', port: 5000, path: `/api/admin/tickets/${targetTicket._id}`, method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  });
  console.log('Result:', detailRes.statusCode === 200 && Array.isArray(detailRes.body.internalNotes) ? 'PASS' : 'FAIL');

  // Test 19: Override Category
  console.log('\nTest 19: Override AI Classification Category');
  const overrideCatRes = await request({
    hostname: '127.0.0.1', port: 5000, path: `/api/admin/tickets/${targetTicket._id}`, method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, { category: 'ISBN & Metadata Issues' });
  console.log('Result:', overrideCatRes.body.category === 'ISBN & Metadata Issues' ? 'PASS' : 'FAIL');

  // Test 20: Override Priority
  console.log('\nTest 20: Override AI Priority to "Critical"');
  const overridePriRes = await request({
    hostname: '127.0.0.1', port: 5000, path: `/api/admin/tickets/${targetTicket._id}`, method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, { priority: 'Critical' });
  console.log('Result:', overridePriRes.body.priority === 'Critical' ? 'PASS' : 'FAIL');

  // Test 21: Assign Ticket to Self
  console.log('\nTest 21: Assign Ticket to Self');
  const assignRes = await request({
    hostname: '127.0.0.1', port: 5000, path: `/api/admin/tickets/${targetTicket._id}`, method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, { assignedToAdminId: adminId });
  const assignedCorrectly = (assignRes.body.assignedToAdminId?._id === adminId || assignRes.body.assignedToAdminId === adminId);
  console.log('Result:', assignedCorrectly ? 'PASS' : 'FAIL');

  // Test 22: Add Internal Note
  console.log('\nTest 22: Add Internal Note & isolated checks');
  const noteText = 'Following up with the payments team regarding this author ticket.';
  const addNoteRes = await request({
    hostname: '127.0.0.1', port: 5000, path: `/api/admin/tickets/${targetTicket._id}/notes`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, { note: noteText });
  const hasNote = addNoteRes.body.internalNotes.some(n => n.note === noteText);

  // Fetch as author and confirm note is absent
  const authorGetRes = await request({
    hostname: '127.0.0.1', port: 5000, path: `/api/authors/me/tickets/${targetTicket._id}`, method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authorToken}` }
  });
  const noteIsolationPass = hasNote && (authorGetRes.body.internalNotes === undefined);
  console.log('Result:', noteIsolationPass ? 'PASS' : 'FAIL');

  // Test 23: AI Draft Response
  console.log('\nTest 23: AI Draft Response Generation');
  const draftRes = await request({
    hostname: '127.0.0.1', port: 5000, path: `/api/admin/tickets/${targetTicket._id}/ai-draft`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  });
  const hasGreeting = draftRes.body.draft && (draftRes.body.draft.includes('Dear') || draftRes.body.draft.includes('Hi') || draftRes.body.draft.includes('Anika') || draftRes.body.draft.includes('author'));
  console.log('Result:', draftRes.body.success && hasGreeting ? 'PASS' : 'FAIL');

  // Test 25: Admin reply status updates
  console.log('\nTest 25: Admin reply status updates');
  const adminReplyRes = await request({
    hostname: '127.0.0.1', port: 5000, path: `/api/admin/tickets/${targetTicket._id}/reply`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, { messageBody: 'Hello author, we are looking into this.' });
  console.log('Result:', adminReplyRes.body.status === 'In Progress' ? 'PASS' : 'FAIL');

  // Test 26: Status Lifecycle resolving & closing
  console.log('\nTest 26: Status Lifecycle resolving & closing');
  const resolveRes = await request({
    hostname: '127.0.0.1', port: 5000, path: `/api/admin/tickets/${targetTicket._id}`, method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, { status: 'Resolved' });
  const closeRes = await request({
    hostname: '127.0.0.1', port: 5000, path: `/api/admin/tickets/${targetTicket._id}`, method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, { status: 'Closed' });
  const lifecyclePass = resolveRes.body.status === 'Resolved' && closeRes.body.status === 'Closed';
  console.log('Result:', lifecyclePass ? 'PASS' : 'FAIL');
};

runTests().catch(console.error);
