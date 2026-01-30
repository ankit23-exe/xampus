import express from 'express';
import { verifyToken, isAdmin } from '../middleware/auth.js';
import {
    getInteractionHistory,
    getInteractionStatus,
    getInteractionStats,
    getOpenInteractions,
    getEscalatedInteractions
} from '../controllers/interactionController.js';

const router = express.Router();

/**
 * Interaction Routes - CRM tracking
 */

// Get user's interaction history
router.get('/:userId', verifyToken, getInteractionHistory);

// Get specific interaction status
router.get('/:id/status', verifyToken, getInteractionStatus);

// Get interaction statistics
router.get('/stats', verifyToken, getInteractionStats);

// Admin routes
router.get('/admin/open', verifyToken, isAdmin, getOpenInteractions);
router.get('/admin/escalated', verifyToken, isAdmin, getEscalatedInteractions);

export default router;
