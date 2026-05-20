const express = require('express');
const { body, query } = require('express-validator');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');

const router = express.Router();

// All admin routes require the 'admin' role
router.use(authMiddleware);
router.use(requireRole('admin'));

const queueValidation = [
  query('status').optional().isIn(['Open', 'In Progress', 'Resolved', 'Closed']).withMessage('Invalid status filter'),
  query('category').optional().notEmpty().withMessage('Category cannot be empty'),
  query('priority').optional().isIn(['Critical', 'High', 'Medium', 'Low']).withMessage('Invalid priority filter'),
  query('fromDate').optional().isISO8601().withMessage('Invalid fromDate format'),
  query('toDate').optional().isISO8601().withMessage('Invalid toDate format'),
];

router.get('/tickets', validate(queueValidation), adminController.getTickets);
router.get('/tickets/:id', adminController.getTicketById);

const updateTicketValidation = [
  body('status').optional().isIn(['Open', 'In Progress', 'Resolved', 'Closed']).withMessage('Invalid status'),
  body('category').optional().notEmpty().withMessage('Category cannot be empty'),
  body('priority').optional().isIn(['Critical', 'High', 'Medium', 'Low']).withMessage('Invalid priority'),
  body('assignedToAdminId').optional().custom((value) => {
    if (value !== null && !value.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid Admin ID format');
    }
    return true;
  }),
];

router.patch('/tickets/:id', validate(updateTicketValidation), adminController.updateTicket);

const replyValidation = [
  body('messageBody').notEmpty().withMessage('Message body is required').trim(),
];

router.post('/tickets/:id/reply', validate(replyValidation), adminController.replyToTicket);

const noteValidation = [
  body('note').notEmpty().withMessage('Note content is required').trim(),
];

router.post('/tickets/:id/notes', validate(noteValidation), adminController.addInternalNote);

router.post('/tickets/:id/ai-draft', adminController.getAIDraft);

module.exports = router;
