const express = require('express');
const { body } = require('express-validator');
const authorController = require('../controllers/authorController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');

const router = express.Router();

// All author routes require the 'author' role
router.use(authMiddleware);
router.use(requireRole('author'));

router.get('/books', authorController.getBooks);
router.get('/tickets', authorController.getTickets);
router.get('/tickets/:id', authorController.getTicketById);

const createTicketValidation = [
  body('subject').notEmpty().withMessage('Subject is required').trim(),
  body('description').notEmpty().withMessage('Description is required').trim(),
  body('bookId').optional().custom((value) => {
    if (value && value !== 'general' && !value.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Invalid book ID format');
    }
    return true;
  }),
];

router.post('/tickets', validate(createTicketValidation), authorController.createTicket);

const updateTicketValidation = [
  body('messageBody').optional().notEmpty().withMessage('Reply message cannot be empty').trim(),
  body('status').optional().isIn(['Closed']).withMessage('Only Closed status can be updated by author'),
];

router.patch('/tickets/:id', validate(updateTicketValidation), authorController.updateTicket);

module.exports = router;
