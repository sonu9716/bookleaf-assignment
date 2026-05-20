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
  console.log('=== RUNNING AUTHOR PORTAL REGRESSION TESTS ===\n');

  // Step 1: Login as Anika Desai
  const loginRes = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'anika.desai@email.com', password: 'bookleaf123' });
  const authorToken = loginRes.body.token;

  // Test 9: Dashboard verification
  console.log('Test 9: Dashboard Verification (Books & Royalties Aggregation)');
  const booksRes = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/authors/me/books', method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authorToken}` }
  });
  
  const books = booksRes.body;
  const totalBooks = books.length;
  const totalEarned = books.reduce((acc, b) => acc + b.totalRoyaltyEarned, 0);
  const paid = books.reduce((acc, b) => acc + b.royaltyPaid, 0);
  const pending = books.reduce((acc, b) => acc + b.royaltyPending, 0);
  const dashboardPass = totalBooks === 2 && totalEarned === 135600 && paid === 108480 && pending === 27120;
  console.log('Result:', dashboardPass ? 'PASS' : 'FAIL');

  // Test 10: My Books Page Details
  console.log('\nTest 10: My Books Page Details & Stage verification');
  const saffronBook = books.find(b => b.title === 'The Saffron Diaries');
  const stagePass = saffronBook.status === 'In Production' && saffronBook.productionStage === 'Cover Design';
  console.log('Result:', stagePass ? 'PASS' : 'FAIL');

  // Test 10b: Zero Royalties Author
  console.log('\nTest 10b: Zero Pending Royalties Verification (Meera Krishnan)');
  const meeraLogin = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'meera.krishnan@email.com', password: 'bookleaf123' });
  const meeraToken = meeraLogin.body.token;
  
  const meeraBooksRes = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/authors/me/books', method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${meeraToken}` }
  });
  const meeraPending = meeraBooksRes.body.reduce((acc, b) => acc + b.royaltyPending, 0);
  console.log('Result:', meeraPending === 0 ? 'PASS' : 'FAIL');

  // Test 11: Submit Support Ticket — Book-Specific
  console.log('\nTest 11: Submit Support Ticket — Book-Specific');
  const whispersBook = books.find(b => b.title === 'Whispers of the Ganges');
  const newTicketRes = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/authors/me/tickets', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authorToken}` }
  }, {
    bookId: whispersBook._id,
    subject: 'My royalty payment is delayed for Q1',
    description: 'Hi support team, I noticed my Q1 royalties are still showing as pending and have not been transferred to my account.'
  });
  
  const ticket = newTicketRes.body;
  const ticketPass = ticket.status === 'Open' && ticket.category === 'Royalty & Payments' && (ticket.priority === 'High' || ticket.priority === 'Critical');
  console.log('Result:', ticketPass ? 'PASS' : 'FAIL');

  // Test 12: Submit Support Ticket — General / Account Level
  console.log('\nTest 12: Submit Support Ticket — General / Account Level');
  const generalTicketRes = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/authors/me/tickets', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authorToken}` }
  }, {
    bookId: null,
    subject: 'Can I update my author bio?',
    description: 'Hi, I would like to update my profile bio. How can I do this?'
  });
  
  const genTicket = generalTicketRes.body;
  const genPass = genTicket.category === 'General Inquiry' && (genTicket.priority === 'Low' || genTicket.priority === 'Medium');
  console.log('Result:', genPass ? 'PASS' : 'FAIL');

  // Test 13: My Tickets Page List
  console.log('\nTest 13: My Tickets Page List');
  const ticketsRes = await request({
    hostname: '127.0.0.1', port: 5000, path: '/api/authors/me/tickets', method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authorToken}` }
  });
  console.log('Result:', ticketsRes.body.length >= 3 ? 'PASS' : 'FAIL');

  // Test 14: Ticket Detail view & original description check
  console.log('\nTest 14: Ticket Detail view & original description check');
  const getTicketRes = await request({
    hostname: '127.0.0.1', port: 5000, path: `/api/authors/me/tickets/${ticket._id}`,
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authorToken}` }
  });
  
  const detailTicket = getTicketRes.body;
  const originalMsgPass = detailTicket.messages[0].body.includes('pending');
  console.log('Result:', originalMsgPass ? 'PASS' : 'FAIL');

  console.log('\nTest 14b: Adding follow-up reply from Author');
  const replyRes = await request({
    hostname: '127.0.0.1', port: 5000, path: `/api/authors/me/tickets/${ticket._id}`,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authorToken}` }
  }, { messageBody: 'Any updates on this? I need this processed soon.' });
  
  const updatedTicket = replyRes.body;
  const lastMessage = updatedTicket.messages[updatedTicket.messages.length - 1];
  const replyPass = lastMessage.senderType === 'author' && lastMessage.body === 'Any updates on this? I need this processed soon.';
  console.log('Result:', replyPass ? 'PASS' : 'FAIL');
};

runTests().catch(console.error);
