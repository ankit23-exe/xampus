import dotenv from 'dotenv';

dotenv.config();
import express from 'express';
import mongoose from 'mongoose';
import fileRoutes from './routes/fileRoutes.js';
import authRoutes from './routes/authRoutes.js';
import issuesRoutes from './routes/issuesRoutes.js';
import queryRoutes from './routes/queryRoutes.js';

import cors from 'cors';

import { chatting } from './controllers/chatController.js'; //GEmini wallah

import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;



// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
// Admin/file upload routes
app.use('/api/files', fileRoutes);

// Authentication routes
app.use('/api/auth', authRoutes);

// Issues/Complaints routes
app.use('/api/issues', issuesRoutes);

// Query log routes (Admin only)
app.use('/api/admin/queries', queryRoutes);



// Chat route (preserved) - Enhanced with query logging
app.post('/chat', async (req, res) => {
  const { question, userId } = req.body; // userId is optional for unanswered query tracking
  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }
  try {
    const answer = await chatting(question, userId);
    res.json({ answer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* 
// 🚀 Telegram Bot Integration (POLLING MODE)
if (process.env.TELEGRAM_BOT_TOKEN) {
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

    bot.on("message", async (msg) => {
        const chatId = msg.chat.id;
        const userMessage = msg.text;

        if (!userMessage) return;

        try {
            // Call your existing /chat route
            const response = await axios.post(`http://localhost:${PORT}/chat`, {
                question: userMessage,
            });

            const reply = response.data.answer || "No answer available.";
            bot.sendMessage(chatId, reply);
        } catch (error) {
            console.error("Telegram bot error:", error.message);
            bot.sendMessage(chatId, "⚠️ Something went wrong, please try again.");
        }
    });

    console.log("🤖 Telegram bot is running...");
} else {
    console.log("⚠️ TELEGRAM_BOT_TOKEN not set in .env, skipping Telegram bot setup.");
}
 */

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});