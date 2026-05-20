# BookLeaf Support Portal: Technical Architecture & Evolution Write-up

This document outlines the priorities, design trade-offs, and roadmap for transitioning the BookLeaf Support Portal from its current state into a resilient, production-ready system.

---

## 🎯 1. What Was Prioritized

When designing and implementing the portal, the following dimensions were prioritized to deliver high immediate value and robust usability:

1. **Information Isolation & Data Privacy**: 
   - Strict access control at the database query level ensures that authors can only access books and tickets belonging to their own user IDs.
   - Internal operations notes (`internalNotes`) are entirely isolated. They are never serialized or sent over the wire in any author-scoped APIs, completely preventing leakage of sensitive staff notes to the end user.
2. **Deterministic Triage & Real-Time Synchronization**:
   - Built a dual-strategy classification system. It leverages Groq’s Llama 3.3 70B model for high-accuracy JSON classification but degrades gracefully to local keyword-based heuristics if the LLM is rate-limited or offline.
   - Employed Socket.IO to enable bidirectional message syncing. Whenever an admin replies, reassigns, or modifies a ticket, the change propagates to the author's screen instantly without requiring page refreshes.
3. **Operations-Focused Admin Experience**:
   - High-contrast indicators for critical priority tickets and sorting capabilities (like date-range filters) ensure that support agents can efficiently manage high-volume queues.
   - One-click AI drafted responses that leverage the linked book’s financial and production metadata to generate contextual, brand-compliant drafts.

---

## ⚖️ 2. Design Trade-offs Made

Building a system within constraints requires deliberate architectural compromises. The following trade-offs were made:

1. **Embedded Message Documents vs. Separate Collection**:
   - *Decision*: Messages are stored as an embedded array of subdocuments inside the `Ticket` schema rather than in a separate `Message` collection with foreign keys.
   - *Trade-off*: This simplifies reads and updates, making database querying highly performant for small-to-medium ticket threads. However, for extremely long threads (e.g., hundreds of replies), it could increase document size towards MongoDB's 16MB document limit.
2. **Stateless JWT-Based Authentication**:
   - *Decision*: Adopted client-signed JWTs without server-side session tracking or token blacklisting.
   - *Trade-off*: Reduces database load and makes the authentication layer trivially simple to scale horizontally. However, immediate token revocation (e.g., in the case of a compromised credentials breach) requires waiting for token expiration or implementing a redis-backed blacklist.
3. **Synchronous LLM Classification during Ticket Creation**:
   - *Decision*: The ticket category and priority are analyzed synchronously when the author submits the creation form.
   - *Trade-off*: This guarantees that tickets are instantly categorized when they hit the admin's global queue. However, if the LLM API is slow, it increases HTTP response times for ticket submission. This was mitigated by setting short timeouts and reverting to local regex parser fallbacks.

---

## 🚀 3. How to Evolve into Production

To scale this platform to thousands of authors and admins, the following enhancements should be implemented:

### A. Scalability & Availability
- **Message Pagination**: Transition the embedded message array to a separate collection using cursor-based pagination to support infinitely growing support threads.
- **WebSocket Scaling**: Implement a Redis Adapter for Socket.IO (`@socket.io/redis-adapter`) to support multiple application instances behind an Application Load Balancer (ALB).
- **Asynchronous LLM Triage**: Shift LLM classifications to an asynchronous background worker using a queue broker (like BullMQ or RabbitMQ) to ensure ticket submission remains instant under all conditions.

### B. Security & Compliance
- **Secure File Attachments**: Move from memory-based files to pre-signed URL uploads directly to Amazon S3 or Google Cloud Storage, applying antivirus scanning (e.g., ClamAV) before saving.
- **Auditing**: Log all critical administrative operations (such as overriding triage priority or accessing restricted book records) to an immutable audit database.
- **Secret Management**: Move API keys from `.env` files to cloud key vaults (such as AWS Secrets Manager or HashiCorp Vault).
