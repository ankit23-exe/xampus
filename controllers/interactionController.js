import Interaction from '../models/Interaction.js';
import KnowledgeGap from '../models/KnowledgeGap.js';

/**
 * CRM Interaction Controllers
 * Handle interaction history, stats, and tracking
 */

// Get user's interaction history
export const getInteractionHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        
        // Verify user can access this history (self or admin)
        if (req.user.id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        const interactions = await Interaction.getUserHistory(userId, limit);
        
        res.json({
            success: true,
            interactions,
            count: interactions.length
        });
    } catch (error) {
        console.error('Error fetching interaction history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch interaction history'
        });
    }
};

// Get specific interaction status
export const getInteractionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        
        const interaction = await Interaction.findById(id)
            .populate('userId', 'name email')
            .populate('relatedIssueId');
        
        if (!interaction) {
            return res.status(404).json({ error: 'Interaction not found' });
        }
        
        // Verify access
        if (req.user.id !== interaction.userId.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        res.json({
            success: true,
            interaction
        });
    } catch (error) {
        console.error('Error fetching interaction:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch interaction'
        });
    }
};

// Get interaction statistics
export const getInteractionStats = async (req, res) => {
    try {
        const userId = req.query.userId;
        
        // If requesting another user's stats, must be admin
        if (userId && userId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        const stats = await Interaction.getStats(userId || null);
        
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics'
        });
    }
};

// Get all open interactions (admin only)
export const getOpenInteractions = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        
        const interactions = await Interaction.find({
            status: { $in: ['open', 'in_progress'] }
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('userId', 'name email')
            .populate('relatedIssueId');
        
        res.json({
            success: true,
            interactions,
            count: interactions.length
        });
    } catch (error) {
        console.error('Error fetching open interactions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch open interactions'
        });
    }
};

// Get escalated interactions (admin only)
export const getEscalatedInteractions = async (req, res) => {
    try {
        const interactions = await Interaction.find({
            status: 'escalated'
        })
            .sort({ createdAt: -1 })
            .populate('userId', 'name email');
        
        res.json({
            success: true,
            interactions,
            count: interactions.length
        });
    } catch (error) {
        console.error('Error fetching escalated interactions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch escalated interactions'
        });
    }
};
