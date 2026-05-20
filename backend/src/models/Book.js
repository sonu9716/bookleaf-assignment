const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
    },
    isbn: {
      type: String,
      trim: true,
      default: null,
    },
    genre: {
      type: String,
      trim: true,
    },
    publicationDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['In Production', 'Published', 'Out of Print'],
      default: 'In Production',
    },
    mrp: {
      type: Number,
      default: 0,
    },
    totalCopiesSold: {
      type: Number,
      default: 0,
    },
    totalRoyaltyEarned: {
      type: Number,
      default: 0,
    },
    royaltyPaid: {
      type: Number,
      default: 0,
    },
    royaltyPending: {
      type: Number,
      default: 0,
    },
    distributionPlatforms: {
      type: [String],
      default: [],
    },
    productionStage: {
      type: String,
      enum: [
        'Manuscript Received',
        'Editing',
        'Cover Design',
        'Typesetting',
        'Proofreading',
        'ISBN Assignment',
        'Printing',
        'Distribution Setup',
        'Published & Live',
      ],
      default: 'Manuscript Received',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Book', bookSchema);
