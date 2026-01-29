import express from 'express';
import {
  getUnansweredQueries,
  markQueryAsAnswered,
  getQueryById,
  deleteQuery,
  getAllQueries
} from '../controllers/queryLogController.js';
import { adminOnly } from '../middleware/auth.js';

const router = express.Router();

// All routes are admin-only
router.get('/unanswered', adminOnly, getUnansweredQueries); // Get unanswered queries (priority view)
router.get('/all', adminOnly, getAllQueries); // Get all queries for analytics
router.get('/:id', adminOnly, getQueryById); // Get single query details
router.patch('/:id/resolve', adminOnly, markQueryAsAnswered); // Mark query as answered
router.delete('/:id', adminOnly, deleteQuery); // Delete query

export default router;
