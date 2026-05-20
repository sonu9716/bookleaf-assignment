const TICKET_CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
];

const TICKET_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

const TICKET_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];

const PRODUCTION_STAGES = [
  'Manuscript Received',
  'Editing',
  'Cover Design',
  'Typesetting',
  'Proofreading',
  'ISBN Assignment',
  'Printing',
  'Distribution Setup',
  'Published & Live',
];

const BOOK_STATUSES = ['In Production', 'Published', 'Out of Print'];

const ROLES = ['author', 'admin'];

module.exports = {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  PRODUCTION_STAGES,
  BOOK_STATUSES,
  ROLES,
};
