import mongoose from 'mongoose';

const queryLogSchema = new mongoose.Schema({
  originalQuestion: {
    type: String,
    required: true,
    trim: true
  },
  normalizedQuestion: {
    type: String,
    required: true,
    trim: true,
    index: true // For faster similarity searches
  },
  answered: {
    type: Boolean,
    default: false,
    index: true // For faster querying of unanswered queries
  },
  answerSource: {
    type: String,
    enum: ['ai', 'human', 'none'],
    default: 'none'
  },
  askedByUsers: [{
    type: String, // Changed from ObjectId to String to support any user identifier
    trim: true
  }],
  askCount: {
    type: Number,
    default: 1,
    index: true // For sorting by popularity
  },
  // Store multiple original questions for admin reference
  originalQuestions: [{
    question: String,
    askedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastAskedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamps before saving
queryLogSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compound index for efficient querying of unanswered queries sorted by askCount
queryLogSchema.index({ answered: 1, askCount: -1 });

const QueryLog = mongoose.model('QueryLog', queryLogSchema);

export default QueryLog;
