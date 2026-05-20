const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Book = require('../models/Book');
const Ticket = require('../models/Ticket');
const connectDB = require('../config/db');

const seedData = async () => {
  try {
    // Connect to database
    await connectDB();

    console.log('Clearing existing data...');
    await User.deleteMany();
    await Book.deleteMany();
    await Ticket.deleteMany();
    console.log('Existing data cleared.');

    // Load sample data JSON
    const dataPath = path.join(__dirname, '..', '..', '..', 'bookleaf_sample_data.json');
    if (!fs.existsSync(dataPath)) {
      throw new Error(`Sample data file not found at: ${dataPath}`);
    }
    
    const sampleData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Seed Admin Users
    console.log('Seeding admin users...');
    const adminDocs = [];
    for (const admin of sampleData.admins) {
      const adminDoc = new User({
        name: admin.name,
        email: admin.email,
        passwordHash: admin.password, // Schema hook hashes this
        role: 'admin',
      });
      const savedAdmin = await adminDoc.save();
      adminDocs.push(savedAdmin);
      console.log(`Seeded Admin: ${admin.name} (${admin.email})`);
    }

    // Seed Authors & Books
    console.log('Seeding authors and books...');
    for (const author of sampleData.authors) {
      const authorDoc = new User({
        name: author.name,
        email: author.email,
        passwordHash: author.password, // Schema hook hashes this
        role: 'author',
      });
      const savedAuthor = await authorDoc.save();
      console.log(`Seeded Author: ${author.name} (${author.email})`);

      for (const book of author.books) {
        const bookDoc = new Book({
          authorId: savedAuthor._id,
          title: book.title,
          isbn: book.isbn,
          genre: book.genre,
          publicationDate: book.publicationDate ? new Date(book.publicationDate) : null,
          status: book.status,
          mrp: book.mrp,
          totalCopiesSold: book.totalCopiesSold,
          totalRoyaltyEarned: book.totalRoyaltyEarned,
          royaltyPaid: book.royaltyPaid,
          royaltyPending: book.royaltyPending,
          distributionPlatforms: book.distributionPlatforms,
          productionStage: book.productionStage,
        });
        await bookDoc.save();
        console.log(`  Seeded Book: "${book.title}"`);
      }
    }

    // Seed some initial demo tickets to show in the portal queues
    console.log('Seeding initial tickets...');
    const anika = await User.findOne({ email: 'anika.desai@email.com' });
    const vikram = await User.findOne({ email: 'vikram.joshi@email.com' });
    const arjun = await User.findOne({ email: 'arjun.malhotra@email.com' });

    const whispersBook = await Book.findOne({ title: 'Whispers of the Ganges' });
    const saffronBook = await Book.findOne({ title: 'The Saffron Diaries' });
    const echoesBook = await Book.findOne({ title: 'Echoes of Empire' });

    const ticket1 = new Ticket({
      authorId: anika._id,
      bookId: whispersBook._id,
      subject: 'Inquiry regarding Q1 royalty disbursal delay',
      description: 'Hi support team, I noticed my Q1 royalties are still showing as pending and have not been transferred to my account. Could you please check this?',
      status: 'Open',
      category: 'Royalty & Payments',
      priority: 'High',
      aiCategoryConfidence: 0.95,
      aiPriorityConfidence: 0.85,
      messages: [
        {
          senderType: 'author',
          senderId: anika._id,
          body: 'Hi support team, I noticed my Q1 royalties are still showing as pending and have not been transferred to my account. Could you please check this?',
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        }
      ]
    });
    await ticket1.save();

    const ticket2 = new Ticket({
      authorId: vikram._id,
      bookId: null,
      subject: 'Updating bank details for payment',
      description: 'I need to update my bank IFSC code and account number. How can I do this securely?',
      status: 'In Progress',
      category: 'Royalty & Payments',
      priority: 'Medium',
      aiCategoryConfidence: 0.90,
      aiPriorityConfidence: 0.75,
      assignedToAdminId: adminDocs[0]._id,
      messages: [
        {
          senderType: 'author',
          senderId: vikram._id,
          body: 'I need to update my bank IFSC code and account number. How can I do this securely?',
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 2 days ago
        },
        {
          senderType: 'admin',
          senderId: adminDocs[0]._id,
          body: 'Hello Vikram, we can definitely help you update your bank details. Please share your updated details with us, or you can send a cancelled cheque via internal portal attachment. Our team will verify and update this within 5-7 business days.',
          createdAt: new Date(Date.now() - 40 * 60 * 60 * 1000),
        }
      ],
      internalNotes: [
        {
          adminId: adminDocs[0]._id,
          note: 'Waiting for author to attach cancelled cheque or PAN card.',
          createdAt: new Date(Date.now() - 39 * 60 * 60 * 1000),
        }
      ]
    });
    await ticket2.save();

    const ticket3 = new Ticket({
      authorId: arjun._id,
      bookId: echoesBook._id,
      subject: 'Reviewing cover draft suggestions',
      description: 'The cover mockups look excellent! However, on the front cover, the subtitle font is slightly illegible against the dark background. Can we increase the contrast?',
      status: 'Open',
      category: 'Book Status & Production Updates',
      priority: 'Medium',
      aiCategoryConfidence: 0.92,
      aiPriorityConfidence: 0.80,
      messages: [
        {
          senderType: 'author',
          senderId: arjun._id,
          body: 'The cover mockups look excellent! However, on the front cover, the subtitle font is slightly illegible against the dark background. Can we increase the contrast?',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        }
      ]
    });
    await ticket3.save();

    console.log('Initial demo tickets seeded successfully!');
    console.log('Database seeding finished successfully!');
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error.message);
    if (mongoose.connection) {
      mongoose.connection.close();
    }
    process.exit(1);
  }
};

seedData();
