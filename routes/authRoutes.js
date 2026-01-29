import express from 'express';
import { signup, login, getProfile } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected route
router.get('/me', authenticate, getProfile);

export default router;
