import mongoose from 'mongoose';

/**
 * Interaction Model - CRM Core
 * Tracks every user interaction through its lifecycle
 * 
 * CRM LIFECYCLE: open → in_progress → resolved/escalated
 */

const interactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    originalQuery: {
        type: String,
        required: true
    },
    intentType: {
        type: String,
        enum: ['INFORMATION', 'ISSUE_CREATION', 'ACTION_REQUEST', 'STATUS_CHECK', 'ESCALATION', 'UNKNOWN'],
        default: 'UNKNOWN'
    },
    domain: {
        type: String,
        enum: ['scholarship', 'admission', 'complaint', 'query', 'general'],
        default: 'general'
    },
    agentUsed: {
        type: String, // Which agent handled this
        default: null
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'escalated'],
        default: 'open'
    },
    outcome: {
        type: mongoose.Schema.Types.Mixed, // Flexible outcome data
        default: null
    },
    metadata: {
        confidence: Number,
        armoriqValidated: Boolean,
        policyChecksPassed: [String],
        blockedBy: String,
        classification: mongoose.Schema.Types.Mixed
    },
    escalationId: {
        type: String,
        default: null
    },
    relatedIssueId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Complaint',
        default: null
    },
    relatedApplicationId: {
        type: String, // Can reference scholarship/admission
        default: null
    },
    resolvedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});

// Indexes for efficient queries
interactionSchema.index({ userId: 1, createdAt: -1 });
interactionSchema.index({ status: 1 });
interactionSchema.index({ intentType: 1, domain: 1 });

// Instance methods
interactionSchema.methods.markResolved = function(outcome) {
    this.status = 'resolved';
    this.outcome = outcome;
    this.resolvedAt = new Date();
    return this.save();
};

interactionSchema.methods.escalate = function(escalationId) {
    this.status = 'escalated';
    this.escalationId = escalationId;
    return this.save();
};

// Static methods
interactionSchema.statics.getStats = async function(userId = null) {
    const query = userId ? { userId } : {};
    
    const stats = await this.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);
    
    const result = {
        total: 0,
        open: 0,
        in_progress: 0,
        resolved: 0,
        escalated: 0
    };
    
    stats.forEach(stat => {
        result[stat._id] = stat.count;
        result.total += stat.count;
    });
    
    return result;
};

interactionSchema.statics.getUserHistory = async function(userId, limit = 50) {
    return this.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'name email')
        .populate('relatedIssueId');
};

const Interaction = mongoose.model('Interaction', interactionSchema);

export default Interaction;
