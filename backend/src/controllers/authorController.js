const Book = require('../models/Book');
const Ticket = require('../models/Ticket');
const aiService = require('../services/aiService');
const { emitToTicket, emitToAdmins } = require('../config/socket');

const getBooks = async (req, res, next) => {
  try {
    const books = await Book.find({ authorId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(books);
  } catch (error) {
    next(error);
  }
};

const getTickets = async (req, res, next) => {
  try {
    const tickets = await Ticket.find({ authorId: req.user._id })
      .select('-internalNotes')
      .populate('bookId', 'title isbn status')
      .sort({ updatedAt: -1 });
    res.status(200).json(tickets);
  } catch (error) {
    next(error);
  }
};

const getTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ _id: req.params.id, authorId: req.user._id })
      .select('-internalNotes')
      .populate('bookId', 'title isbn status mrp totalCopiesSold totalRoyaltyEarned royaltyPaid royaltyPending distributionPlatforms productionStage')
      .populate('assignedToAdminId', 'name email');

    if (!ticket) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Ticket not found or access denied',
      });
    }

    res.status(200).json(ticket);
  } catch (error) {
    next(error);
  }
};

const createTicket = async (req, res, next) => {
  try {
    const { bookId, subject, description } = req.body;

    // Validate book belongs to author if bookId is provided
    let linkedBook = null;
    if (bookId && bookId !== 'general') {
      linkedBook = await Book.findOne({ _id: bookId, authorId: req.user._id });
      if (!linkedBook) {
        return res.status(400).json({
          error: 'ValidationError',
          message: 'Invalid book selected or book does not belong to you',
        });
      }
    }

    // Trigger AI classification
    const aiClassification = await aiService.classifyTicket(subject, description);

    // Create ticket document
    const newTicket = new Ticket({
      authorId: req.user._id,
      bookId: linkedBook ? linkedBook._id : null,
      subject,
      description,
      status: 'Open',
      category: aiClassification.category,
      priority: aiClassification.priority,
      aiCategoryConfidence: aiClassification.categoryConfidence,
      aiPriorityConfidence: aiClassification.priorityConfidence,
      messages: [
        {
          senderType: 'author',
          senderId: req.user._id,
          body: description,
          createdAt: new Date(),
        },
      ],
    });

    const savedTicket = await newTicket.save();

    // Populate book details to return a complete response
    const populatedTicket = await Ticket.findById(savedTicket._id)
      .select('-internalNotes')
      .populate('bookId', 'title isbn status')
      .populate('authorId', 'name email');

    // Notify admins about new ticket in real-time
    emitToAdmins('ticket:created', populatedTicket);

    res.status(201).json(populatedTicket);
  } catch (error) {
    next(error);
  }
};

const updateTicket = async (req, res, next) => {
  try {
    const { messageBody, status } = req.body;
    
    const ticket = await Ticket.findOne({ _id: req.params.id, authorId: req.user._id });
    if (!ticket) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Ticket not found or access denied',
      });
    }

    // Author is sending a message/reply
    if (messageBody) {
      ticket.messages.push({
        senderType: 'author',
        senderId: req.user._id,
        body: messageBody,
        createdAt: new Date(),
      });
      // Automatically reopen ticket if closed/resolved and author replies
      if (ticket.status === 'Closed' || ticket.status === 'Resolved') {
        ticket.status = 'In Progress';
      }
    }

    // Author is closing the ticket
    if (status === 'Closed') {
      ticket.status = 'Closed';
      ticket.messages.push({
        senderType: 'system',
        body: 'Ticket has been closed by the author.',
        createdAt: new Date(),
      });
    }

    const updatedTicket = await ticket.save();
    
    const populatedTicket = await Ticket.findById(updatedTicket._id)
      .select('-internalNotes')
      .populate('bookId', 'title isbn status')
      .populate('authorId', 'name email')
      .populate('assignedToAdminId', 'name email');

    // Notify all active viewers of this ticket (both admin and author)
    emitToTicket(populatedTicket._id.toString(), 'ticket:updated', populatedTicket);
    // Also notify general admin queue
    emitToAdmins('ticket:updated', populatedTicket);

    res.status(200).json(populatedTicket);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBooks,
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
};
