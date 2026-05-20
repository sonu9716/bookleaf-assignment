const http = require('http');
const { io } = require('socket.io-client');

const request = (options, postData) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve({ statusCode: res.statusCode, body: data ? JSON.parse(data) : null }); }
        catch (e) { resolve({ statusCode: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (postData) { req.write(JSON.stringify(postData)); }
    req.end();
  });
};

const runSocketTests = async () => {
  console.log('=== RUNNING REAL-TIME WEBSOCKET REGRESSION TESTS ===\n');

  // Step 1: Login
  const adminLogin = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'priya.sharma@bookleaf.in', password: 'bookleaf123' });
  const adminToken = adminLogin.body.token;

  const authorLogin = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'anika.desai@email.com', password: 'bookleaf123' });
  const authorToken = authorLogin.body.token;

  // Create ticket
  const newTicket = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/authors/me/tickets', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authorToken}` }
  }, { bookId: null, subject: 'Socket Test', description: 'Testing live sync.' });
  const ticketId = newTicket.body._id;

  // Establish Sockets
  const wsUrl = 'http://localhost:5000';
  const authorSocket = io(wsUrl, { auth: { token: authorToken }, transports: ['websocket'] });
  const adminSocket = io(wsUrl, { auth: { token: adminToken }, transports: ['websocket'] });

  await new Promise((resolve) => {
    let connectedCount = 0;
    const check = () => { connectedCount++; if (connectedCount === 2) resolve(); };
    authorSocket.on('connect', check);
    adminSocket.on('connect', check);
  });

  authorSocket.emit('ticket:join', ticketId);
  adminSocket.emit('ticket:join', ticketId);

  // Test 27: Admin replies, Author gets it live
  console.log('Test Scenario 27: Live message sync');
  const messagePromise = new Promise((resolve) => {
    authorSocket.on('ticket:updated', (data) => {
      const lastMsg = data.messages[data.messages.length - 1];
      if (lastMsg.senderType === 'admin') {
        resolve(lastMsg.body);
      }
    });
  });

  await request({
    hostname: '127.0.0.1', port: 5000, path: `/api/admin/tickets/${ticketId}/reply`, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }
  }, { messageBody: 'Hello from socket test!' });

  const receivedBody = await messagePromise;
  console.log('Result:', receivedBody === 'Hello from socket test!' ? 'PASS' : 'FAIL');

  // Test 28: Queue Live Update broadcast
  console.log('\nTest Scenario 28: Ticket queue live updates');
  const queuePromise = new Promise((resolve) => {
    adminSocket.on('ticket:created', (data) => {
      if (data.subject === 'New Socket Ticket Broadcast') {
        resolve(true);
      }
    });
  });

  await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/authors/me/tickets', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authorToken}` }
  }, { bookId: null, subject: 'New Socket Ticket Broadcast', description: 'Testing queue.' });

  const broadcastPass = await queuePromise;
  console.log('Result:', broadcastPass ? 'PASS' : 'FAIL');

  authorSocket.disconnect();
  adminSocket.disconnect();
};

runSocketTests().catch(console.error);
