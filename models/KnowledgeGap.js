import mongoose from 'mongoose';

/**
 * KnowledgeGap Model - Tracks unanswered queries
 * Helps identify gaps in knowledge base and prioritize content creation
 */

const originalQuerySchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    askedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    askedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const resolutionSchema = new mongoose.Schema({
    answer: {
        type: String,
        required: true
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const knowledgeGapSchema = new mongoose.Schema({
    normalizedQuery: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    originalQueries: [originalQuerySchema],
    askCount: {
        type: Number,
        default: 1
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'critical'],
        default: 'normal'
    },
    status: {
        type: String,
        enum: ['open', 'under_review', 'resolved'],
        default: 'open'
    },
    category: {
        type: String,
        enum: ['scholarship', 'admission', 'academic', 'facilities', 'general'],
        default: 'general'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    resolution: {
        type: resolutionSchema,
        default: null
    }
}, {
    timestamps: true
});

// Indexes
knowledgeGapSchema.index({ normalizedQuery: 1 });
knowledgeGapSchema.index({ status: 1, askCount: -1 });
knowledgeGapSchema.index({ priority: 1 });

// Pre-save middleware to update priority based on askCount
knowledgeGapSchema.pre('save', function(next) {
    if (this.askCount >= 10) {
        this.priority = 'critical';
    } else if (this.askCount >= 5) {
        this.priority = 'high';
    } else if (this.askCount >= 2) {
        this.priority = 'normal';
    } else {
        this.priority = 'low';
    }
    next();
});

// Instance methods
knowledgeGapSchema.methods.incrementAskCount = function(query, userId) {
    this.askCount += 1;
    this.originalQueries.push({
        text: query,
        askedBy: userId || null,
        askedAt: new Date()
    });
    return this.save();
};

knowledgeGapSchema.methods.resolve = function(answer, adminId) {
    this.status = 'resolved';
    this.resolution = {
        answer,
        addedBy: adminId,
        addedAt: new Date()
    };
    return this.save();
};

knowledgeGapSchema.methods.assignTo = function(adminId) {
    this.status = 'under_review';
    this.assignedTo = adminId;
    return this.save();
};

// Static methods
knowledgeGapSchema.statics.findOrCreate = async function(query, userId) {
    const normalized = query.toLowerCase().trim();
    
    let gap = await this.findOne({ normalizedQuery: normalized, status: 'open' });
    
    if (gap) {
        // Increment ask count
        await gap.incrementAskCount(query, userId);
        return { gap, created: false };
    } else {
        // Create new gap
        gap = await this.create({
            normalizedQuery: normalized,
            originalQueries: [{
                text: query,
                askedBy: userId || null,
                askedAt: new Date()
            }],
            askCount: 1,
            status: 'open'
        });
        return { gap, created: true };
    }
};

knowledgeGapSchema.statics.getTopGaps = async function(limit = 20) {
    return this.find({ status: 'open' })
        .sort({ askCount: -1 })
        .limit(limit)
        .populate('assignedTo', 'name email');
};

knowledgeGapSchema.statics.getStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAsks: { $sum: '$askCount' }
            }
        }
    ]);
    
    const result = {
        total: 0,
        open: 0,
        under_review: 0,
        resolved: 0,
        total_asks: 0
    };
    
    stats.forEach(stat => {
        result[stat._id] = stat.count;
        result.total += stat.count;
        result.total_asks += stat.totalAsks;
    });
    
    return result;
};

const KnowledgeGap = mongoose.model('KnowledgeGap', knowledgeGapSchema);

export default KnowledgeGap;
