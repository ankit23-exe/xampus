import express from 'express';
import { verifyToken, isAdmin } from '../middleware/auth.js';
import {
    getKnowledgeGaps,
    getTopGaps,
    getKnowledgeGapStats,
    resolveKnowledgeGap,
    assignKnowledgeGap,
    getGapsByCategory
} from '../controllers/knowledgeGapController.js';

const router = express.Router();

/**
 * Knowledge Gap Routes - Admin only
 * Track unanswered queries for knowledge base improvement
 */

// Get all knowledge gaps
router.get('/', verifyToken, isAdmin, getKnowledgeGaps);

// Get top unanswered questions
router.get('/top', verifyToken, isAdmin, getTopGaps);

// Get statistics
router.get('/stats', verifyToken, isAdmin, getKnowledgeGapStats);

// Get gaps by category
router.get('/category/:category', verifyToken, isAdmin, getGapsByCategory);

// Resolve knowledge gap
router.post('/:id/resolve', verifyToken, isAdmin, resolveKnowledgeGap);

// Assign knowledge gap to admin
router.post('/:id/assign', verifyToken, isAdmin, assignKnowledgeGap);

export default router;
