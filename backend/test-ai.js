const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// We will load the real AI Service first
let aiService = require('./src/services/aiService');

const runAllTests = async () => {
  console.log('===============================================================================');
  console.log('STARTING BOOKLEAF AI SERVICE INTEGRATION TESTS');
  console.log('===============================================================================\n');

  // ===============================================================================
  // TEST 1 — AUTO-CLASSIFICATION
  // ===============================================================================
  console.log('===============================================================================');
  console.log('TEST 1 — AUTO-CLASSIFICATION (ticket categorization + priority)');
  console.log('===============================================================================\n');

  const testCases1 = [
    {
      id: '1A',
      subject: "I haven't received any royalty for 6 months",
      description: "My book has been published since November last year and I have not received a single royalty payment. My bank details are linked.",
      validate: (res) => {
        const catPass = res.category === 'Royalty & Payments';
        const priPass = res.priority === 'High' || res.priority === 'Critical';
        const confPass = res.categoryConfidence > 0.85;
        return {
          pass: catPass && priPass,
          details: `Category: "${res.category}" (${catPass ? 'PASS' : 'FAIL'}), Priority: "${res.priority}" (${priPass ? 'PASS' : 'FAIL'}), Confidence: ${res.categoryConfidence} (${confPass ? 'PASS' : 'FAIL'})`
        };
      }
    },
    {
      id: '1B',
      subject: "Can I update my author bio on Amazon?",
      description: "I want to change my author biography on my Amazon author page.",
      validate: (res) => {
        const catPass = res.category === 'General Inquiry';
        const priPass = res.priority === 'Low';
        return {
          pass: catPass && priPass,
          details: `Category: "${res.category}" (${catPass ? 'PASS' : 'FAIL'}), Priority: "${res.priority}" (${priPass ? 'PASS' : 'FAIL'})`
        };
      }
    },
    {
      id: '1C',
      subject: "My book is showing a different ISBN on Amazon",
      description: "The ISBN on my physical book copy is 978-81-XXXX-XX-X but Amazon is showing a completely different number.",
      validate: (res) => {
        const catPass = res.category.toLowerCase().includes('isbn') || res.category.toLowerCase().includes('metadata');
        const priPass = res.priority === 'High' || res.priority === 'Critical';
        return {
          pass: catPass && priPass,
          details: `Category: "${res.category}" (${catPass ? 'PASS' : 'FAIL'}), Priority: "${res.priority}" (${priPass ? 'PASS' : 'FAIL'})`
        };
      }
    },
    {
      id: '1D',
      subject: "Print quality terrible, images blurry",
      description: "I received my 10 author copies and the print quality is absolutely terrible. All images are blurry and pages are misaligned.",
      validate: (res) => {
        const catPass = res.category === 'Printing & Quality';
        const priPass = res.priority === 'High';
        return {
          pass: catPass && priPass,
          details: `Category: "${res.category}" (${catPass ? 'PASS' : 'FAIL'}), Priority: "${res.priority}" (${priPass ? 'PASS' : 'FAIL'})`
        };
      }
    },
    {
      id: '1E',
      subject: "Book showing unavailable on Flipkart",
      description: "My book was published 2 weeks ago but it still shows Currently Unavailable on Flipkart.",
      validate: (res) => {
        const catPass = res.category === 'Distribution & Availability';
        const priPass = res.priority === 'Medium';
        return {
          pass: catPass && priPass,
          details: `Category: "${res.category}" (${catPass ? 'PASS' : 'FAIL'}), Priority: "${res.priority}" (${priPass ? 'PASS' : 'FAIL'})`
        };
      }
    }
  ];

  let test1Summary = [];
  let test1OverallPass = true;

  for (const tc of testCases1) {
    console.log(`Running Test ${tc.id}...`);
    console.log(`Subject: "${tc.subject}"`);
    console.log(`Description: "${tc.description}"`);
    
    try {
      const res = await aiService.classifyTicket(tc.subject, tc.description);
      console.log('Actual Response:', JSON.stringify(res, null, 2));
      
      const validation = tc.validate(res);
      console.log('Validation:', validation.details);
      
      if (validation.pass) {
        console.log(`✅ Test ${tc.id}: PASS\n`);
        test1Summary.push(`✅ Test ${tc.id}: PASS`);
      } else {
        console.log(`❌ Test ${tc.id}: FAIL\n`);
        test1Summary.push(`❌ Test ${tc.id}: FAIL (${validation.details})`);
        test1OverallPass = false;
      }
    } catch (err) {
      console.error(`❌ Test ${tc.id}: FAILED WITH EXCEPTION`, err);
      test1Summary.push(`❌ Test ${tc.id}: FAIL (exception: ${err.message})`);
      test1OverallPass = false;
    }
  }

  console.log('TEST 1 SUMMARY:');
  test1Summary.forEach(line => console.log('  ' + line));
  console.log(test1OverallPass ? '✅ PASS — all 5 returned correct category + priority' : '❌ FAIL — one or more tests failed');
  console.log('\n');

  // ===============================================================================
  // TEST 2 — AI DRAFT RESPONSE
  // ===============================================================================
  console.log('===============================================================================');
  console.log('TEST 2 — AI DRAFT RESPONSE (knowledge base usage + tone)');
  console.log('===============================================================================\n');

  const ticket2 = {
    subject: "No royalty received for 6 months",
    description: "My book has been selling on Amazon and Flipkart since November 2025. I still haven't received any royalty payment.",
    category: "Royalty & Payments",
    priority: "High"
  };

  const author2 = {
    name: "Anika Desai",
    email: "anika.desai@email.com"
  };

  const book2 = {
    title: "Echoes of Tomorrow",
    isbn: "978-81-XXXX-01-1",
    status: "Published",
    productionStage: "Published & Live",
    mrp: 299,
    totalCopiesSold: 142,
    totalRoyaltyEarned: 18650,
    royaltyPaid: 0,
    royaltyPending: 18650,
    distributionPlatforms: ["Amazon India", "Flipkart", "BookLeaf Store"]
  };

  const recentMessages2 = [
    {
      senderType: "author",
      body: "I published my book 6 months ago and still haven't received any royalty. ₹18,650 is showing as pending. What is going on?"
    }
  ];

  let test2Result = null;
  try {
    test2Result = await aiService.generateDraftResponse(ticket2, author2, book2, recentMessages2);
  } catch (err) {
    console.error('Failed to generate draft response:', err);
  }

  let test2OverallPass = false;
  if (test2Result && test2Result.success) {
    const draftText = test2Result.draft;
    console.log('------------------ FULL DRAFT RESPONSE START ------------------');
    console.log(draftText);
    console.log('------------------- FULL DRAFT RESPONSE END -------------------\n');

    // Perform quality checks
    // 1. Addresses author as "Anika" (by first name)
    // Check if contains "Anika" but not followed by "Desai" in the greeting, or just simple greeting verification
    const greetingMatch = /Hi\s+Anika\b|Dear\s+Anika\b|Hello\s+Anika\b/i.test(draftText);
    const firstNameOnly = greetingMatch && !/Anika\s+Desai/i.test(draftText.split('\n')[0]);
    
    // 2. Mentions the 80/20 royalty split
    const splitMatch = /80\/20|80-20|80%?\s*[\/\-]?\s*20%?|80%?\s*(?:to\s*the\s*author|author's\s*share)|20%?\s*(?:retained|bookleaf)/i.test(draftText);

    // 3. Mentions quarterly calculation and 45-day payout window
    const quarterlyMatch = /quarterly/i.test(draftText);
    const payoutMatch = /45-day|45\s*days/i.test(draftText);

    // 4. References actual figures: ₹18,650 pending
    const figuresMatch = /18,?650/i.test(draftText);

    // 5. Gives a concrete timeline ("within 48 hours" or similar)
    const timelineMatch = /within\s*(?:24|48|72)\s*hours|5-7\s*business\s*days/i.test(draftText);

    // 6. Ends with clear next steps for both BookLeaf and the author
    const nextStepsMatch = /next\s*steps|what\s*we\s*will\s*do|what\s*you\s*need\s*to\s*do/i.test(draftText) || (draftText.toLowerCase().includes('next') && draftText.toLowerCase().includes('steps'));

    // 7. Does NOT sound like generic AI
    const genericGreetingMatch = /Thank\s+you\s+for\s+(?:contacting|reaching\s+out\s+to)\s+support/i.test(draftText);
    const isNotGeneric = !genericGreetingMatch;

    // 8. Does NOT deflect or give vague reassurances
    const vagueReassurances = /rest\s+assured|don't\s*worry/i.test(draftText);
    const isNotVague = !vagueReassurances;

    const checks = [
      { name: 'Addresses author as "Anika" (by first name)', pass: firstNameOnly },
      { name: 'Mentions the 80/20 royalty split', pass: splitMatch },
      { name: 'Mentions quarterly calculation and 45-day payout window', pass: quarterlyMatch && payoutMatch },
      { name: 'References actual figures: ₹18,650 pending', pass: figuresMatch },
      { name: 'Gives a concrete timeline ("within 48 hours" or similar)', pass: timelineMatch },
      { name: 'Ends with clear next steps for both BookLeaf and the author', pass: nextStepsMatch },
      { name: 'Does NOT sound like generic AI ("Thank you for contacting support...")', pass: isNotGeneric },
      { name: 'Does NOT deflect or give vague reassurances', pass: isNotVague }
    ];

    let passedChecksCount = 0;
    console.log('QUALITY CHECKS:');
    checks.forEach(c => {
      if (c.pass) {
        console.log(`  ✅ PASS: ${c.name}`);
        passedChecksCount++;
      } else {
        console.log(`  ❌ FAIL: ${c.name}`);
      }
    });

    console.log(`Passed checks count: ${passedChecksCount}/8`);
    if (passedChecksCount >= 6) {
      test2OverallPass = true;
    }
  } else {
    console.log('❌ Draft response generation failed.');
  }
  console.log('\n');

  // ===============================================================================
  // TEST 3 — GRACEFUL DEGRADATION
  // ===============================================================================
  console.log('===============================================================================');
  console.log('TEST 3 — GRACEFUL DEGRADATION (AI failure handling)');
  console.log('===============================================================================\n');

  const originalKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = 'invalid_key_test_xxx';

  // Force reload of aiService to use the invalid key
  delete require.cache[require.resolve('./src/services/aiService')];
  const aiServiceDegraded = require('./src/services/aiService');

  let test3APass = false;
  let test3BPass = false;
  let test3CPass = false;

  // 3A — classifyTicket() with invalid key
  console.log('Running 3A — classifyTicket() with invalid key...');
  try {
    const classification = await aiServiceDegraded.classifyTicket('royalty issue', 'not paid');
    console.log('Classification response with invalid key:', JSON.stringify(classification, null, 2));
    
    // EXPECTED: Returns fallback values without throwing an error
    const isFallbackCategory = classification.category === 'Royalty & Payments' || classification.category === 'General Inquiry';
    const isFallbackPriority = classification.priority === 'Medium' || classification.priority === 'High';
    const isFallbackConfidence = classification.categoryConfidence <= 0.7;

    if (isFallbackCategory && isFallbackPriority && isFallbackConfidence) {
      console.log('✅ PASS: 3A returned correct fallback values without throwing');
      test3APass = true;
    } else {
      console.log('❌ FAIL: 3A returned unexpected values:', classification);
    }
  } catch (err) {
    console.log('❌ FAIL: 3A threw an uncaught error:', err.message);
  }
  console.log('\n');

  // 3B — generateDraftResponse() with invalid key
  console.log('Running 3B — generateDraftResponse() with invalid key...');
  try {
    const draftRes = await aiServiceDegraded.generateDraftResponse(ticket2, author2, book2, recentMessages2);
    console.log('Draft response with invalid key:', JSON.stringify(draftRes, null, 2));

    // EXPECTED: Returns { success: false, draft: "...reply manually..." }
    const successIsFalse = draftRes.success === false;
    const containsReplyManually = draftRes.draft.toLowerCase().includes('manually');

    if (successIsFalse && containsReplyManually) {
      console.log('✅ PASS: 3B returned failure object gracefully');
      test3BPass = true;
    } else {
      console.log('❌ FAIL: 3B returned unexpected object:', draftRes);
    }
  } catch (err) {
    console.log('❌ FAIL: 3B threw an uncaught error:', err.message);
  }
  console.log('\n');

  // 3C — Create a ticket via POST /api/authors/me/tickets with invalid key
  console.log('Running 3C — Create ticket via POST /api/authors/me/tickets with invalid key...');
  
  // Set up temporary server on port 5001
  process.env.PORT = 5001;
  const dbConnectedPromise = new Promise((resolve) => {
    mongoose.connection.once('open', resolve);
  });

  // Load backend server
  const serverModule = require('./src/index');

  // Helper request function for localhost:5001
  const request5001 = (path, method, headers, postData) => {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: 5001,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      }, (res) => {
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

  try {
    await dbConnectedPromise;
    console.log('Database connected on test server. Fetching author...');
    const User = require('./src/models/User');
    const author = await User.findOne({ email: 'anika.desai@email.com' });
    if (!author) {
      throw new Error('Could not find author "anika.desai@email.com" in database. Did you run the seed script?');
    }

    const token = jwt.sign({ id: author._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const postTicketData = {
      subject: 'Royalty issue with invalid key',
      description: 'I have not been paid and there is an invalid key'
    };

    const apiRes = await request5001(
      '/api/authors/me/tickets',
      'POST',
      { 'Authorization': `Bearer ${token}` },
      postTicketData
    );

    console.log('POST Response:', JSON.stringify(apiRes, null, 2));

    // EXPECTED: Ticket created in MongoDB (201 response)
    // Ticket has default category and priority from fallback
    // No 500 error returned
    const createdInMongo = apiRes.statusCode === 201;
    const bodyValid = apiRes.body && apiRes.body.category && apiRes.body.priority;
    
    if (createdInMongo && bodyValid) {
      console.log('✅ PASS: Ticket created successfully with fallback values under invalid key');
      test3CPass = true;
    } else {
      console.log(`❌ FAIL: Expected 201 response. Got ${apiRes.statusCode}. Body:`, apiRes.body);
    }
  } catch (err) {
    console.log('❌ FAIL: 3C failed with exception:', err.message);
  }

  // Restore environment key
  process.env.GROQ_API_KEY = originalKey;
  console.log('\n');

  // ===============================================================================
  // FINAL SUMMARY
  // ===============================================================================
  console.log('===============================================================================');
  console.log('FINAL SUMMARY');
  console.log('===============================================================================\n');

  console.log('AI Test Results:');
  console.log(`  Test 1 — Classification:    ${test1OverallPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Test 2 — Draft Response:    ${test2OverallPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Test 3 — Degradation:       ${test3APass && test3BPass && test3CPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`    - 3A Classify fallback:   ${test3APass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`    - 3B Draft fallback:      ${test3BPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`    - 3C POST fallback:       ${test3CPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  const overallPass = test1OverallPass && test2OverallPass && test3APass && test3BPass && test3CPass;
  console.log(`Overall AI Integration: ${overallPass ? '✅ READY FOR SUBMISSION' : '❌ NEEDS FIXES'}`);

  // Disconnect from database and exit
  mongoose.connection.close();
  setTimeout(() => {
    process.exit(overallPass ? 0 : 1);
  }, 1000);
};

runAllTests().catch(err => {
  console.error('Unhandled failure in runAllTests:', err);
  process.exit(1);
});
