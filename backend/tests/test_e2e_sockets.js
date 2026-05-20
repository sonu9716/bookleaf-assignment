const http = require('http');
const { io } = require('socket.io-client');

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

const runE2ETest = async () => {
  console.log('=== RUNNING REAL-TIME END-TO-END VERIFICATION (CHECK 10) ===\n');

  // 1. Login as Author
  console.log('Logging in as Author: anika.desai@email.com');
  const authorLogin = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'anika.desai@email.com', password: 'bookleaf123' });
  const authorToken = authorLogin.body.token;

  // 2. Fetch Author tickets to get an ID
  console.log('Fetching author tickets...');
  const authorTickets = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/authors/me/tickets', method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authorToken}` }
  });
  
  let ticketId;
  if (authorTickets.body && authorTickets.body.length > 0) {
    ticketId = authorTickets.body[0]._id;
    console.log(`Using existing ticket ID: ${ticketId}`);
  } else {
    // Create one if none exists
    console.log('Creating a new test ticket...');
    const newTicket = await request({
      hostname: '127.0.0.1', port: 5000, path: '/api/authors/me/tickets', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authorToken}` }
    }, { bookId: null, subject: 'E2E Check 10 Ticket', description: 'Testing check 10 socket.io' });
    ticketId = newTicket.body._id;
    console.log(`Created new ticket ID: ${ticketId}`);
  }

  // 3. Login as Admin
  console.log('Logging in as Admin: priya.sharma@bookleaf.in');
  const adminLogin = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'priya.sharma@bookleaf.in', password: 'bookleaf123' });
  const adminToken = adminLogin.body.token;

  // 4. Establish Socket.IO Client for Author
  console.log('Connecting Socket.IO client for Author...');
  const authorSocket = io('http://localhost:5000', {
    auth: { token: authorToken },
    transports: ['websocket']
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Socket connection timed out')), 5000);
    authorSocket.on('connect', () => {
      console.log(`Author Socket connected. ID: ${authorSocket.id}`);
      clearTimeout(timeout);
      resolve();
    });
  });

  // 5. Author joins the ticket room
  console.log(`Author socket emitting join:ticket for ticket room: ticket:${ticketId}`);
  authorSocket.emit('join:ticket', ticketId);

  // 6. Setup promise to receive 'ticket:message:new' event
  const messagePromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Event ticket:message:new not received within 5 seconds')), 5000);
    authorSocket.on('ticket:message:new', (data) => {
      clearTimeout(timeout);
      resolve(data);
    });
  });

  // Wait a small bit to ensure room joining completed
  await new Promise(r => setTimeout(r, 200));

  // 7. Simulate admin reply by calling POST /api/admin/tickets/:id/reply
  console.log('Calling Admin Reply API...');
  const replyRes = await request({
    hostname: '127.0.0.1', port: 5000, path: `/api/admin/tickets/${ticketId}/reply`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, { messageBody: 'Test real-time message' });

  if (replyRes.statusCode !== 200) {
    throw new Error(`Admin reply API returned status code ${replyRes.statusCode}: ${JSON.stringify(replyRes.body)}`);
  }

  // 8. Confirm event received and print it
  console.log('Waiting for socket event "ticket:message:new"...');
  const receivedData = await messagePromise;
  console.log('\nSuccess! Socket event received:');
  console.log(JSON.stringify(receivedData, null, 2));

  // Cleanup
  authorSocket.disconnect();
  console.log('\n=== CHECK 10 END-TO-END TEST PASSED ===');
};

runE2ETest().catch(err => {
  console.error('\n❌ CHECK 10 END-TO-END TEST FAILED:', err);
  process.exit(1);
});
