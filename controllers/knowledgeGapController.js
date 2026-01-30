import KnowledgeGap from '../models/KnowledgeGap.js';

/**
 * Knowledge Gap Controllers
 * Handle unanswered queries and knowledge base improvements
 */

// Get all knowledge gaps (admin only)
export const getKnowledgeGaps = async (req, res) => {
    try {
        const status = req.query.status || 'open';
        const category = req.query.category;
        
        const query = { status };
        if (category) {
            query.category = category;
        }
        
        const gaps = await KnowledgeGap.find(query)
            .sort({ askCount: -1 })
            .populate('assignedTo', 'name email')
            .populate('resolution.addedBy', 'name email');
        
        res.json({
            success: true,
            knowledge_gaps: gaps,
            count: gaps.length
        });
    } catch (error) {
        console.error('Error fetching knowledge gaps:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch knowledge gaps'
        });
    }
};

// Get top unanswered questions (admin only)
export const getTopGaps = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        
        const gaps = await KnowledgeGap.getTopGaps(limit);
        
        res.json({
            success: true,
            top_gaps: gaps,
            count: gaps.length
        });
    } catch (error) {
        console.error('Error fetching top gaps:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch top gaps'
        });
    }
};

// Get knowledge gap statistics (admin only)
export const getKnowledgeGapStats = async (req, res) => {
    try {
        const stats = await KnowledgeGap.getStats();
        
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Error fetching knowledge gap stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics'
        });
    }
};

// Resolve knowledge gap (admin only)
export const resolveKnowledgeGap = async (req, res) => {
    try {
        const { id } = req.params;
        const { answer } = req.body;
        
        if (!answer) {
            return res.status(400).json({
                success: false,
                error: 'Answer is required'
            });
        }
        
        const gap = await KnowledgeGap.findById(id);
        
        if (!gap) {
            return res.status(404).json({
                success: false,
                error: 'Knowledge gap not found'
            });
        }
        
        await gap.resolve(answer, req.user.id);
        
        res.json({
            success: true,
            message: 'Knowledge gap resolved successfully',
            knowledge_gap: gap
        });
    } catch (error) {
        console.error('Error resolving knowledge gap:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to resolve knowledge gap'
        });
    }
};

// Assign knowledge gap to admin (admin only)
export const assignKnowledgeGap = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminId } = req.body;
        
        const gap = await KnowledgeGap.findById(id);
        
        if (!gap) {
            return res.status(404).json({
                success: false,
                error: 'Knowledge gap not found'
            });
        }
        
        await gap.assignTo(adminId || req.user.id);
        
        res.json({
            success: true,
            message: 'Knowledge gap assigned successfully',
            knowledge_gap: gap
        });
    } catch (error) {
        console.error('Error assigning knowledge gap:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to assign knowledge gap'
        });
    }
};

// Get knowledge gaps by category (admin only)
export const getGapsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        
        const gaps = await KnowledgeGap.find({
            category,
            status: 'open'
        })
            .sort({ askCount: -1 })
            .populate('assignedTo', 'name email');
        
        res.json({
            success: true,
            category,
            knowledge_gaps: gaps,
            count: gaps.length
        });
    } catch (error) {
        console.error('Error fetching gaps by category:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch knowledge gaps'
        });
    }
};
