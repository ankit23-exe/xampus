import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  imageUrl: {
    type: String,
    default: null
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['cleanliness', 'infrastructure', 'safety', 'academic', 'hostel', 'transport', 'other'],
    default: 'other'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved'],
    default: 'open'
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  upvoteCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
complaintSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Update upvoteCount whenever upvotes array changes
complaintSchema.pre('save', function(next) {
  this.upvoteCount = this.upvotes.length;
  next();
});

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;
