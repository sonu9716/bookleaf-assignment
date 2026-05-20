const Ticket = require('../models/Ticket');
const Book = require('../models/Book');
const User = require('../models/User');
const aiService = require('../services/aiService');
const { emitToTicket, emitToAdmins, emitToUser } = require('../config/socket');

const getTickets = async (req, res, next) => {
  try {
    const { status, category, priority, fromDate, toDate } = req.query;
    
    // Construct filter query
    const filter = {};
    
    if (status) {
      filter.status = status;
    }
    if (category) {
      filter.category = category;
    }
    if (priority) {
      filter.priority = priority;
    }
    
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        filter.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        filter.createdAt.$lte = new Date(toDate);
      }
    }

    const tickets = await Ticket.find(filter)
      .populate('authorId', 'name email')
      .populate('bookId', 'title isbn status')
      .populate('assignedToAdminId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json(tickets);
  } catch (error) {
    next(error);
  }
};

const getTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('authorId', 'name email')
      .populate('bookId', 'title isbn status mrp totalCopiesSold totalRoyaltyEarned royaltyPaid royaltyPending distributionPlatforms productionStage')
      .populate('assignedToAdminId', 'name email')
      .populate('internalNotes.adminId', 'name')
      .populate('messages.senderId', 'name email role');

    if (!ticket) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Ticket not found',
      });
    }

    res.status(200).json(ticket);
  } catch (error) {
    next(error);
  }
};

const updateTicket = async (req, res, next) => {
  try {
    const { status, category, priority, assignedToAdminId } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Ticket not found',
      });
    }

    let statusChanged = false;
    let assignmentChanged = false;

    if (status && ticket.status !== status) {
      ticket.status = status;
      statusChanged = true;
      ticket.messages.push({
        senderType: 'system',
        body: `Ticket status was updated to "${status}" by ${req.user.name}.`,
        createdAt: new Date(),
      });
    }

    if (category) {
      ticket.category = category;
    }

    if (priority) {
      ticket.priority = priority;
    }

    if (assignedToAdminId !== undefined) {
      // Allow unassigning by passing null
      if (assignedToAdminId === null) {
        ticket.assignedToAdminId = null;
      } else {
        const adminUser = await User.findOne({ _id: assignedToAdminId, role: 'admin' });
        if (!adminUser) {
          return res.status(400).json({
            error: 'ValidationError',
            message: 'Assigned user must be an admin',
          });
        }
        ticket.assignedToAdminId = adminUser._id;
      }
      assignmentChanged = true;
    }

    const updatedTicket = await ticket.save();

    const populatedTicket = await Ticket.findById(updatedTicket._id)
      .populate('authorId', 'name email')
      .populate('bookId', 'title isbn status')
      .populate('assignedToAdminId', 'name email')
      .populate('internalNotes.adminId', 'name');

    // Notify ticket room viewers
    emitToTicket(populatedTicket._id.toString(), 'ticket:updated', populatedTicket);
    // Notify admin queue
    emitToAdmins('ticket:updated', populatedTicket);
    // Notify individual author about the update
    emitToUser(populatedTicket.authorId._id.toString(), 'ticket:updated', populatedTicket);

    res.status(200).json(populatedTicket);
  } catch (error) {
    next(error);
  }
};

const replyToTicket = async (req, res, next) => {
  try {
    const { messageBody } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Ticket not found',
      });
    }

    // Append new message from admin
    ticket.messages.push({
      senderType: 'admin',
      senderId: req.user._id,
      body: messageBody,
      createdAt: new Date(),
    });

    // Auto-update status to In Progress if it was Open
    if (ticket.status === 'Open') {
      ticket.status = 'In Progress';
    }

    // Auto-assign to the replying admin if not currently assigned
    if (!ticket.assignedToAdminId) {
      ticket.assignedToAdminId = req.user._id;
    }

    const updatedTicket = await ticket.save();

    const populatedTicket = await Ticket.findById(updatedTicket._id)
      .populate('authorId', 'name email')
      .populate('bookId', 'title isbn status')
      .populate('assignedToAdminId', 'name email')
      .populate('internalNotes.adminId', 'name');

    // Emit live socket updates
    emitToTicket(populatedTicket._id.toString(), 'ticket:updated', populatedTicket);
    emitToTicket(populatedTicket._id.toString(), 'ticket:message:new', {
      ticketId: populatedTicket._id.toString(),
      message: populatedTicket.messages[populatedTicket.messages.length - 1]
    });
    emitToAdmins('ticket:updated', populatedTicket);
    emitToUser(populatedTicket.authorId._id.toString(), 'ticket:message:new', populatedTicket.messages[populatedTicket.messages.length - 1]);

    res.status(200).json(populatedTicket);
  } catch (error) {
    next(error);
  }
};

const addInternalNote = async (req, res, next) => {
  try {
    const { note } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Ticket not found',
      });
    }

    ticket.internalNotes.push({
      adminId: req.user._id,
      note,
      createdAt: new Date(),
    });

    const updatedTicket = await ticket.save();

    const populatedTicket = await Ticket.findById(updatedTicket._id)
      .populate('authorId', 'name email')
      .populate('bookId', 'title isbn status')
      .populate('assignedToAdminId', 'name email')
      .populate('internalNotes.adminId', 'name');

    // Notify admins viewing this ticket (no emit to author, since notes are internal)
    emitToTicket(populatedTicket._id.toString(), 'ticket:updated', populatedTicket);

    res.status(201).json(populatedTicket);
  } catch (error) {
    next(error);
  }
};

const getAIDraft = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Ticket not found',
      });
    }

    const author = await User.findById(ticket.authorId);
    let book = null;
    if (ticket.bookId) {
      book = await Book.findById(ticket.bookId);
    }

    // Take only the last 3 messages for context efficiency
    const recentMessages = ticket.messages.slice(-3);

    const draftResult = await aiService.generateDraftResponse(ticket, author, book, recentMessages);

    res.status(200).json(draftResult);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTickets,
  getTicketById,
  updateTicket,
  replyToTicket,
  addInternalNote,
  getAIDraft,
};
