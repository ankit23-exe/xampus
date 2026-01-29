import express from 'express';
import {
  createIssue,
  getAllIssues,
  getIssueById,
  toggleUpvote,
  getAdminIssues,
  updateIssueStatus
} from '../controllers/issuesController.js';
import { authenticate, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Student routes
router.post('/', authenticate, createIssue); // Student creates issue
router.get('/', getAllIssues); // Anyone can view issues
router.get('/:id', getIssueById); // Get single issue details
router.post('/:id/upvote', authenticate, toggleUpvote); // Student upvotes/removes upvote

// Admin routes
router.get('/admin/all', adminOnly, getAdminIssues); // Admin views all issues with stats
router.patch('/admin/:id/status', adminOnly, updateIssueStatus); // Admin updates status

export default router;
