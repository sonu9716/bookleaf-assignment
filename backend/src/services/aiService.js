const Groq = require('groq-sdk');
const { BOOKLEAF_KNOWLEDGE_BASE } = require('./knowledgeBase');

let groq = null;

if (
  process.env.GROQ_API_KEY &&
  process.env.GROQ_API_KEY !== 'your-groq-api-key-here'
) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
} else {
  console.log('AI Service: No valid Groq API key. Using fallback heuristics.');
}

// ─── CLASSIFY TICKET ─────────────────────────────────────────────────────────
const classifyTicket = async (subject, description) => {
  try {
    if (!groq) return getFallbackClassification(subject, description);

    const systemPrompt = `You are a support triage assistant for BookLeaf Publishing.
Classify the author support ticket into EXACTLY one of these categories:
1. "Royalty & Payments"
2. "ISBN & Metadata Issues"
3. "Printing & Quality"
4. "Distribution & Availability"
5. "Book Status & Production Updates"
6. "General Inquiry"

Assign a priority level:
- "Critical" (severe issue blocking publication or mass print defect)
- "High" (missing royalty, wrong ISBN on Amazon, print defects on author copies)
- "Medium" (production stage queries, minor metadata fixes, platform sync delays, book showing unavailable or out of stock on Amazon/Flipkart)
- "Low" (general questions, bio updates, advice)

Respond with ONLY raw JSON, no markdown, no explanation:
{
  "category": "exact category string",
  "priority": "exact priority string",
  "categoryConfidence": 0.0,
  "priorityConfidence": 0.0
}`;

    const response = await groq.chat.completions.create({
      model: process.env.AI_MODEL_NAME || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Subject: ${subject}\nDescription: ${description}` }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const json = JSON.parse(response.choices[0].message.content.trim());

    return {
      category: json.category || 'General Inquiry',
      priority: json.priority || 'Medium',
      categoryConfidence: typeof json.categoryConfidence === 'number' ? json.categoryConfidence : 0.8,
      priorityConfidence: typeof json.priorityConfidence === 'number' ? json.priorityConfidence : 0.8,
    };
  } catch (error) {
    console.error('AI Service - Classification failed:', error.message);
    return getFallbackClassification(subject, description);
  }
};

// ─── GENERATE DRAFT RESPONSE ──────────────────────────────────────────────────
const generateDraftResponse = async (ticket, author, book, recentMessages) => {
  try {
    if (!groq) {
      return {
        success: false,
        draft: 'AI draft generation is unavailable (API key not configured). Please reply manually.',
      };
    }

    const recentHistoryText = recentMessages.length > 0
      ? recentMessages.map(m => `${m.senderType.toUpperCase()}: ${m.body}`).join('\n')
      : `Author original query: ${ticket.description}`;

    const bookContext = book
      ? `Linked Book: "${book.title}" (ISBN: ${book.isbn || 'Not yet assigned'})
Status: ${book.status} | Stage: ${book.productionStage}
MRP: ₹${book.mrp} | Copies Sold: ${book.totalCopiesSold}
Royalty Earned: ₹${book.totalRoyaltyEarned} | Paid: ₹${book.royaltyPaid} | Pending: ₹${book.royaltyPending}
Platforms: ${(book.distributionPlatforms || []).join(', ')}`
      : 'Query is at General / Account Level (no specific book linked).';

    const systemPrompt = `You are a support representative for BookLeaf Publishing.

BOOKLEAF KNOWLEDGE BASE:
${BOOKLEAF_KNOWLEDGE_BASE}

BUSINESS RULE OVERRIDES & POLICIES (Strictly apply these over standard KB if there is a conflict):
- Start the response with a greeting specifically using "Hi ${author.name.split(' ')[0]}," or "Dear ${author.name.split(' ')[0]},".
- Explicitly mention that we operate on an 80/20 royalty split (where the author receives 80% and BookLeaf receives 20%).
- Explicitly mention that royalties are calculated quarterly with a 45-day payout window.
- Give a concrete timeline for our follow-up actions (such as "within 48 hours" or "in 5-7 business days").

TONE GUIDELINES:
- Empathetic and professional. Authors are partners, not customers.
- Acknowledge the concern BEFORE jumping to solutions.
- Use actual numbers, dates, and statuses from the context provided (like the ₹18,650 pending royalty).
- If it is BookLeaf's fault, own it directly. No corporate deflection.
- End every response with a clear next steps section detailing actions for both BookLeaf and the author.
- Write as a plain email body. No subject line, no JSON, no markdown headers.
- Do NOT use generic, robotic greetings or AI introduction clichés (like "Thank you for contacting support", "Thank you for reaching out", "We hope this email finds you well", etc.). Start directly and warmly with the greeting.
- Do NOT use vague reassurances or deflective phrases like "rest assured" or "don't worry". Keep the reassurance concrete and grounded in action.`;

    const userPrompt = `Author: ${author.name} (${author.email})
${bookContext}

Ticket Subject: ${ticket.subject}
Category: ${ticket.category}
Priority: ${ticket.priority}

Recent Conversation:
${recentHistoryText}

Write the support response now:`;

    const response = await groq.chat.completions.create({
      model: process.env.AI_MODEL_NAME || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
    });

    return {
      success: true,
      draft: response.choices[0].message.content.trim(),
    };
  } catch (error) {
    console.error('AI Service - Draft generation failed:', error.message);
    return {
      success: false,
      draft: 'AI draft generation failed due to an API error. Please reply manually.',
    };
  }
};

// ─── FALLBACK HEURISTICS (when Groq is unavailable) ──────────────────────────
const getFallbackClassification = (subject, description) => {
  const text = `${subject} ${description}`.toLowerCase();
  let category = 'General Inquiry';
  let priority = 'Medium';
  let categoryConfidence = 0.5;
  let priorityConfidence = 0.5;

  if (text.includes('royalty') || text.includes('payment') || text.includes('payout') || text.includes('bank')) {
    category = 'Royalty & Payments';
    categoryConfidence = 0.7;
    if (text.includes('not received') || text.includes('6 months') || text.includes('unpaid') || text.includes('delay')) {
      priority = 'High';
      priorityConfidence = 0.65;
    }
  } else if (text.includes('isbn') || text.includes('metadata') || text.includes('barcode')) {
    category = 'ISBN & Metadata Issues';
    categoryConfidence = 0.7;
  } else if (text.includes('print') || text.includes('quality') || text.includes('binding') || text.includes('blurry') || text.includes('misaligned')) {
    category = 'Printing & Quality';
    categoryConfidence = 0.7;
    if (text.includes('defective') || text.includes('damaged')) {
      priority = 'High';
      priorityConfidence = 0.65;
    }
  } else if (text.includes('amazon') || text.includes('flipkart') || text.includes('unavailable') || text.includes('distribution')) {
    category = 'Distribution & Availability';
    categoryConfidence = 0.7;
  } else if (text.includes('typeset') || text.includes('stage') || text.includes('editing') || text.includes('manuscript') || text.includes('production')) {
    category = 'Book Status & Production Updates';
    categoryConfidence = 0.7;
  }

  if (text.includes('critical') || text.includes('urgent') || text.includes('wrong book') || text.includes('legal') || text.includes('blocking')) {
    priority = 'Critical';
    priorityConfidence = 0.6;
  }

  return { category, priority, categoryConfidence, priorityConfidence };
};

module.exports = { classifyTicket, generateDraftResponse };