const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderType: {
    type: String,
    enum: ['author', 'admin', 'system'],
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  body: {
    type: String,
    required: [true, 'Message body is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const internalNoteSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  note: {
    type: String,
    required: [true, 'Note content is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ticketSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      default: null,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
      index: true,
    },
    category: {
      type: String,
      enum: [
        'Royalty & Payments',
        'ISBN & Metadata Issues',
        'Printing & Quality',
        'Distribution & Availability',
        'Book Status & Production Updates',
        'General Inquiry',
      ],
      default: 'General Inquiry',
    },
    priority: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'Medium',
    },
    aiCategoryConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    aiPriorityConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    messages: [messageSchema],
    internalNotes: [internalNoteSchema],
    assignedToAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ticket', ticketSchema);
